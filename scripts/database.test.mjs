import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";

const projectRoot = process.env.SCHOLARPATH_TEST_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(projectRoot, "package.json"));
const { PGlite } = require("@electric-sql/pglite");

const userIds = {
  student: "10000000-0000-4000-8000-000000000001",
  otherStudent: "10000000-0000-4000-8000-000000000002",
  moderator: "10000000-0000-4000-8000-000000000003",
  admin: "10000000-0000-4000-8000-000000000004",
  otherAdmin: "10000000-0000-4000-8000-000000000005",
};

let db;

async function asUser(userId, action, role = "authenticated") {
  await db.exec("savepoint acting_as_user");
  try {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    await db.exec(`set local role ${role}`);
    return await action();
  } catch (error) {
    await db.exec("rollback to savepoint acting_as_user");
    throw error;
  } finally {
    await db.exec("release savepoint acting_as_user");
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', true)");
  }
}

// An expected SQL rejection aborts its statement. The savepoint keeps the rest
// of the test's transaction usable, including subsequent permission checks.
async function expectSqlError(sql, params = [], codes = ["42501"]) {
  await db.exec("savepoint expected_failure");
  let rejected;
  try {
    await db.query(sql, params);
  } catch (error) {
    rejected = error;
  } finally {
    await db.exec("rollback to savepoint expected_failure");
    await db.exec("release savepoint expected_failure");
  }
  assert.ok(rejected, `Expected SQL to be rejected: ${sql}`);
  assert.ok(codes.includes(rejected.code), `Unexpected SQLSTATE ${rejected.code}: ${rejected.message}`);
  return rejected;
}

async function insertPersonalSubject(subjectId = "qa-math", semester = 3, academicYear = "2026-2027") {
  const { rows } = await db.query(`
    insert into public.student_subjects(subject_id, academic_year, semester)
    values ($1, $2, $3) returning *
  `, [subjectId, academicYear, semester]);
  return rows[0];
}

async function seedFixture() {
  for (const [name, id] of Object.entries(userIds)) {
    await db.query("insert into auth.users(id, email) values ($1, $2)", [id, `${name}@example.com`]);
  }
  await db.query("update public.user_roles set role = 'moderator' where user_id = $1", [userIds.moderator]);
  await db.query("update public.user_roles set role = 'admin' where user_id in ($1, $2)", [userIds.admin, userIds.otherAdmin]);
  await db.exec(`
    insert into public.semesters(number, title, is_active)
      select value, value || ' semester', true from generate_series(1, 8) value
      on conflict (number) do nothing;
    insert into public.universities(id, name) values ('qa-university', 'QA University');
    insert into public.programs(id, university_id, name) values
      ('qa-program-a', 'qa-university', 'Program A'),
      ('qa-program-b', 'qa-university', 'Program B');
    insert into public.study_groups(id, program_id, name, year) values
      ('qa-group-a1', 'qa-program-a', 'A1', 2),
      ('qa-group-a2', 'qa-program-a', 'A2', 2),
      ('qa-group-b', 'qa-program-b', 'B', 2);
    insert into public.subjects(id, program_id, code, title, credits) values
      ('qa-math', 'qa-program-a', 'QA MATH', 'Mathematics snapshot', 3),
      ('qa-other-a', 'qa-program-a', 'QA OTHER', 'Outside assigned group', 5),
      ('qa-other-b', 'qa-program-b', 'QA B', 'Outside program', 4);
    insert into public.study_plan_items(group_id, subject_id, semester) values
      ('qa-group-a1', 'qa-math', 3),
      ('qa-group-a1', 'qa-math', 4),
      ('qa-group-a2', 'qa-other-a', 3),
      ('qa-group-b', 'qa-other-b', 3);
  `);
  await db.query("insert into public.moderator_groups(moderator_id, group_id) values ($1, 'qa-group-a1')", [userIds.moderator]);
  await db.query("update public.profiles set group_id = 'qa-group-a1' where id in ($1, $2)", [userIds.student, userIds.otherStudent]);
}

describe("ScholarPath database migration and access rules", { concurrency: false }, () => {
  before(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        email text,
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
    `);
    if (process.env.SCHOLARPATH_SCHEMA_FILE) {
      await db.exec(await readFile(process.env.SCHOLARPATH_SCHEMA_FILE, "utf8"));
    } else {
      const directory = join(projectRoot, "supabase", "migrations");
      const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
      assert.ok(files.length, "At least one database migration must exist");
      for (const file of files) await db.exec(await readFile(join(directory, file), "utf8"));
    }
    await seedFixture();
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec("begin"); });
  afterEach(async () => { await db.exec("rollback"); });

  test("catalog seed can run twice and creates no accounts or private student data", async () => {
    const migrations = join(projectRoot, "supabase", "migrations");
    const seedName = (await readdir(migrations)).find((name) => name.endsWith("_scholarpath_catalog_seed.sql"));
    assert.ok(seedName, "The catalogue seed migration must exist");
    const seedPath = process.env.SCHOLARPATH_SEED_FILE ?? join(migrations, seedName);
    const seed = await readFile(seedPath, "utf8");
    const beforeUsers = (await db.query("select count(*) from auth.users")).rows[0].count;
    await db.exec(seed);
    const beforeCounts = (await db.query(`select
      (select count(*) from public.subjects) as subjects,
      (select count(*) from public.study_groups) as groups,
      (select count(*) from public.study_plan_items) as plans,
      (select count(*) from public.calendar_terms) as terms`)).rows[0];
    await db.exec("update public.subjects set credits = 9 where id = 'math'");
    await db.exec(seed);
    const afterCounts = (await db.query(`select
      (select count(*) from public.subjects) as subjects,
      (select count(*) from public.study_groups) as groups,
      (select count(*) from public.study_plan_items) as plans,
      (select count(*) from public.calendar_terms) as terms`)).rows[0];
    assert.deepEqual(afterCounts, beforeCounts);
    assert.equal((await db.query("select credits from public.subjects where id = 'math'")).rows[0].credits, 9);
    assert.equal((await db.query("select count(*) from auth.users")).rows[0].count, beforeUsers);
    for (const table of ["student_subjects", "assessments", "grade_forecasts"]) {
      assert.equal(Number((await db.query(`select count(*) from public.${table}`)).rows[0].count), 0);
    }
  });

  test("signup creates a student and ignores user-editable role metadata", async () => {
    const id = "20000000-0000-4000-8000-000000000001";
    await db.query(`insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id, "spoof@example.com", JSON.stringify({ role: "admin", app_role: "admin", user_role: "admin" }),
    ]);
    const { rows } = await db.query(`select p.id, r.role from public.profiles p join public.user_roles r on r.user_id = p.id where p.id = $1`, [id]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].role, "student");
  });

  test("authenticated users edit their own profile and cannot read or edit another profile", async () => {
    await asUser(userIds.student, async () => {
      assert.equal((await db.query("select current_user as role, auth.uid() as id")).rows[0].role, "authenticated");
      const changed = await db.query("update public.profiles set first_name = 'Updated', last_name = 'Student', group_id = 'qa-group-a1' where id = $1 returning id", [userIds.student]);
      assert.equal(changed.rows.length, 1);
      assert.equal((await db.query("select * from public.profiles where id = $1", [userIds.otherStudent])).rows.length, 0);
      const other = await db.query("update public.profiles set first_name = 'Forbidden' where id = $1 returning id", [userIds.otherStudent]);
      assert.equal(other.rows.length, 0);
    });
    assert.notEqual((await db.query("select first_name from public.profiles where id = $1", [userIds.otherStudent])).rows[0].first_name, "Forbidden");
  });

  test("personal subjects, assessments, forecasts and computed results are private even from administrators", async () => {
    const personal = await asUser(userIds.student, async () => {
      const row = await insertPersonalSubject();
      await db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 80, 90, 100)", [row.id]);
      await db.query("insert into public.grade_forecasts(student_subject_id, grade) values ($1, 'A')", [row.id]);
      assert.equal((await db.query("select * from public.student_results where id = $1", [row.id])).rows.length, 1);
      return row;
    });
    for (const viewer of [userIds.otherStudent, userIds.moderator, userIds.admin]) {
      await asUser(viewer, async () => {
        for (const [table, column] of [["student_subjects", "id"], ["assessments", "student_subject_id"], ["grade_forecasts", "student_subject_id"], ["student_results", "id"]]) {
          assert.equal((await db.query(`select * from public.${table} where ${column} = $1`, [personal.id])).rows.length, 0, `${viewer} can read ${table}`);
        }
        assert.equal((await db.query("update public.assessments set exam = 0 where student_subject_id = $1 returning student_subject_id", [personal.id])).rows.length, 0);
        await expectSqlError("insert into public.grade_forecasts(student_subject_id, grade) values ($1, 'F')", [personal.id]);
      });
    }
  });

  test("moderator updates assigned subjects but cannot update subjects outside the assigned group", async () => {
    await asUser(userIds.moderator, async () => {
      const own = await db.query("update public.subjects set title = 'Scoped update' where id = 'qa-math' returning id");
      assert.equal(own.rows.length, 1);
      const outside = await db.query("update public.subjects set title = 'Forbidden' where id in ('qa-other-a', 'qa-other-b') returning id");
      assert.equal(outside.rows.length, 0);
    });
    const { rows } = await db.query("select title from public.subjects where id in ('qa-other-a', 'qa-other-b')");
    assert.ok(rows.every((row) => row.title !== "Forbidden"));
  });

  test("moderator can create a university, empty program and subject while group creation remains restricted", async () => {
    await asUser(userIds.moderator, async () => {
      const university = (await db.query("insert into public.universities(name) values ('Moderator university') returning id")).rows[0];
      const program = (await db.query("insert into public.programs(university_id, name) values ($1, 'New program') returning id", [university.id])).rows[0];
      const renamed = await db.query("update public.programs set name = 'Renamed program' where id = $1 returning id", [program.id]);
      assert.equal(renamed.rows.length, 1);
      const subject = await db.query("insert into public.subjects(program_id, title, credits) values ($1, 'New subject', 3) returning id", [program.id]);
      assert.equal(subject.rows.length, 1);
      await expectSqlError("insert into public.study_groups(program_id, name, year) values ($1, 'Forbidden group', 1)", [program.id]);
    });
  });

  test("students cannot self-promote or call the administrator role RPC", async () => {
    await asUser(userIds.student, async () => {
      await expectSqlError("update public.user_roles set role = 'admin' where user_id = $1", [userIds.student]);
      await expectSqlError("insert into public.user_roles(user_id, role) values ($1, 'admin')", [userIds.student]);
      await expectSqlError("select public.admin_set_user_role($1, 'moderator')", [userIds.student], ["42501", "P0001"]);
      await expectSqlError("insert into public.moderator_groups(moderator_id, group_id) values ($1, 'qa-group-b')", [userIds.student]);
    });
    assert.equal((await db.query("select role from public.user_roles where user_id = $1", [userIds.student])).rows[0].role, "student");
  });

  test("administrator RPC changes ordinary roles and protects self and administrator accounts", async () => {
    await asUser(userIds.admin, async () => {
      await expectSqlError("update public.user_roles set role = 'student' where user_id = $1", [userIds.admin]);
      await db.query("select public.admin_set_user_role($1, 'moderator')", [userIds.otherStudent]);
      await expectSqlError("select public.admin_set_user_role($1, 'admin')", [userIds.student], ["42501", "23514", "P0001"]);
      await expectSqlError("select public.admin_set_user_role($1, 'student')", [userIds.admin], ["42501", "23514", "P0001"]);
      await expectSqlError("select public.admin_set_user_role($1, 'student')", [userIds.otherAdmin], ["42501", "23514", "P0001"]);
    });
    assert.equal((await db.query("select role from public.user_roles where user_id = $1", [userIds.otherStudent])).rows[0].role, "moderator");
    await db.query("update public.user_roles set role = 'student' where user_id = $1", [userIds.otherAdmin]);
    await asUser(userIds.admin, async () => {
      await expectSqlError("select public.admin_set_user_role($1, 'student')", [userIds.admin], ["42501", "23514", "P0001"]);
    });
    assert.equal(Number((await db.query("select count(*) from public.user_roles where role = 'admin'")).rows[0].count), 1);
  });

  test("anonymous sessions cannot call role RPCs or read private records", async () => {
    await asUser(null, async () => {
      await expectSqlError("select public.admin_set_user_role($1, 'moderator')", [userIds.student], ["42501", "P0001"]);
      await expectSqlError("select * from public.profiles");
      await expectSqlError("select * from public.student_results");
    }, "anon");
  });

  test("credits, assessment scores and academic years are constrained", async () => {
    for (const credits of [0, 31, -1]) {
      await expectSqlError("insert into public.subjects(program_id, code, title, credits) values ('qa-program-a', 'INVALID', 'Invalid credits', $1)", [credits], ["23514"]);
    }
    await asUser(userIds.student, async () => {
      const personal = await insertPersonalSubject();
      for (const score of [-1, 101, "NaN", "Infinity"]) {
        await expectSqlError("insert into public.assessments(student_subject_id, rk1) values ($1, $2)", [personal.id, score], ["23514", "22003"]);
      }
      for (const year of ["2026", "2026-2028", "2027-2026"]) {
        await expectSqlError("insert into public.student_subjects(subject_id, academic_year, semester) values ('qa-math', $1, 3)", [year], ["23514", "22003", "22007"]);
      }
    });
  });

  test("numeric assessment rounding gives 25/FX at the decimal boundary and partial scores stay ungraded", async () => {
    await asUser(userIds.student, async () => {
      const personal = await insertPersonalSubject();
      await db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 4.1, 66.1, 8.6)", [personal.id]);
      let result = (await db.query("select final_score, grade, grade_points from public.student_results where id = $1", [personal.id])).rows[0];
      assert.equal(Number(result.final_score), 25);
      assert.equal(result.grade, "FX");
      assert.equal(Number(result.grade_points), 0.5);
      await db.query("update public.assessments set rk1 = 0, rk2 = 0, exam = 0 where student_subject_id = $1", [personal.id]);
      result = (await db.query("select final_score, grade, grade_points from public.student_results where id = $1", [personal.id])).rows[0];
      assert.equal(Number(result.final_score), 0);
      assert.equal(result.grade, "F");
      await db.query("update public.assessments set exam = null where student_subject_id = $1", [personal.id]);
      result = (await db.query("select final_score, grade, grade_points from public.student_results where id = $1", [personal.id])).rows[0];
      assert.equal(result.final_score, null);
      assert.equal(result.grade, null);
      assert.equal(result.grade_points, null);
    });
  });

  test("same subject in separate semesters creates separate grade records and repeated requests cannot duplicate them", async () => {
    await asUser(userIds.student, async () => {
      const autumn = await insertPersonalSubject("qa-math", 3);
      const spring = await insertPersonalSubject("qa-math", 4);
      assert.notEqual(autumn.id, spring.id);
      assert.equal(autumn.semester, 3);
      assert.equal(spring.semester, 4);
      await db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 100, 100, 100), ($2, 0, 0, 0)", [autumn.id, spring.id]);
      const { rows } = await db.query("select semester, grade from public.student_results where id in ($1, $2) order by semester", [autumn.id, spring.id]);
      assert.deepEqual(rows.map(({ semester, grade }) => ({ semester, grade })), [{ semester: 3, grade: "A" }, { semester: 4, grade: "F" }]);
      await expectSqlError("insert into public.student_subjects(subject_id, academic_year, semester) values ('qa-math', '2026-2027', 3)", [], ["23505"]);
      await expectSqlError("insert into public.assessments(student_subject_id, rk1) values ($1, 50)", [autumn.id], ["23505"]);
    });
  });

  test("student snapshots survive catalog edits and cannot be forged or reassigned", async () => {
    const personal = await asUser(userIds.student, () => insertPersonalSubject());
    assert.equal(personal.student_id, userIds.student);
    assert.equal(personal.title, "Mathematics snapshot");
    assert.equal(personal.credits, 3);
    await db.exec("update public.subjects set title = 'New catalog title', credits = 7 where id = 'qa-math'");
    await asUser(userIds.student, async () => {
      const existing = (await db.query("select * from public.student_subjects where id = $1", [personal.id])).rows[0];
      assert.equal(existing.title, "Mathematics snapshot");
      assert.equal(existing.credits, 3);
      for (const [column, value] of [["credits", 30], ["title", "Forged"], ["student_id", userIds.otherStudent], ["semester", 8]]) {
        await expectSqlError(`update public.student_subjects set ${column} = $1 where id = $2`, [value, personal.id]);
      }
      await expectSqlError("insert into public.student_subjects(subject_id, academic_year, semester, credits) values ('qa-math', '2027-2028', 3, 30)");
    });
    const fresh = await asUser(userIds.otherStudent, () => insertPersonalSubject());
    assert.equal(fresh.credits, 7);
    assert.equal(fresh.title, "New catalog title");
  });

  test("archiving excludes new student selections and preserves existing grades and snapshots", async () => {
    const personal = await asUser(userIds.student, () => insertPersonalSubject());
    await db.exec("update public.subjects set archived_at = now() where id = 'qa-math'");
    await asUser(userIds.otherStudent, async () => {
      await expectSqlError("insert into public.student_subjects(subject_id, academic_year, semester) values ('qa-math', '2026-2027', 3)", [], ["23514", "42501", "P0001"]);
    });
    await asUser(userIds.student, async () => {
      await db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 80, 90, 100)", [personal.id]);
      const result = (await db.query("select title, credits, grade from public.student_results where id = $1", [personal.id])).rows[0];
      assert.equal(result.title, "Mathematics snapshot");
      assert.equal(result.credits, 3);
      assert.equal(result.grade, "A−");
    });
  });

  test("closed semesters reject new student records and plan items while existing assessments remain editable", async () => {
    const personal = await asUser(userIds.student, () => insertPersonalSubject());
    await db.exec("update public.semesters set is_active = false where number = 3");
    await asUser(userIds.otherStudent, async () => {
      await expectSqlError("insert into public.student_subjects(subject_id, academic_year, semester) values ('qa-math', '2026-2027', 3)", [], ["23514"]);
    });
    await asUser(userIds.admin, async () => {
      await expectSqlError("insert into public.study_plan_items(group_id, subject_id, semester) values ('qa-group-a1', 'qa-other-a', 3)", [], ["23514"]);
    });
    await asUser(userIds.student, async () => {
      await db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 80, 90, 100)", [personal.id]);
      assert.equal((await db.query("select grade from public.student_results where id = $1", [personal.id])).rows[0].grade, "A−");
    });
  });

  test("moderator cannot edit official calendar terms, rewrite sources or mark a local calendar official", async () => {
    await db.exec(`
      insert into public.academic_sources(id, university_id, academic_year, title, url, checked_at, scope)
        values ('qa-source', 'qa-university', '2026-2027', 'Official calendar', 'https://example.com/calendar.pdf', '2026-11-25', 'QA course');
      insert into public.academic_calendars(id, university_id, academic_year, scope, status, source_id) values
        ('qa-official-calendar', 'qa-university', '2026-2027', 'QA course', 'official', 'qa-source'),
        ('qa-local-calendar', 'qa-university', '2026-2027', 'QA course', 'local', 'qa-source');
      insert into public.calendar_terms(id, calendar_id, season, period, rk1, rk2) values
        ('qa-official-autumn', 'qa-official-calendar', 'autumn', '{"kind":"weeks","start":1,"end":16}', '{"kind":"weeks","start":7,"end":7}', '{"kind":"weeks","start":14,"end":14}');
    `);
    await asUser(userIds.moderator, async () => {
      const terms = await db.query("update public.calendar_terms set rk1 = '{\"kind\":\"weeks\",\"start\":8,\"end\":8}' where id = 'qa-official-autumn' returning id");
      assert.equal(terms.rows.length, 0);
      const source = await db.query("update public.academic_sources set title = 'Forged source' where id = 'qa-source' returning id");
      assert.equal(source.rows.length, 0);
      await expectSqlError("update public.academic_calendars set status = 'official' where id = 'qa-local-calendar'");
    });
  });

  test("study plans cannot attach subjects from another program", async () => {
    await expectSqlError("insert into public.study_plan_items(group_id, subject_id, semester) values ('qa-group-a1', 'qa-other-b', 4)", [], ["23503", "23514", "P0001"]);
  });
});
