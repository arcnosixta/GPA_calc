import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { browser } from "../src/lib/browser-test-runtime.mjs";

const projectRoot = process.env.SCHOLARPATH_TEST_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(projectRoot, "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const { calculateAssessmentResult, calculateGpa, earnsCredits, gradePoints } = browser().loadProject(
  join(projectRoot, "src", "components", "student", "integration-adapter.ts"),
);

const numberOrNull = (value) => value === null ? null : Number(value);

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
      const own = await db.query("update public.assessments set exam = 95 where student_subject_id = $1 returning exam", [row.id]);
      assert.equal(Number(own.rows[0].exam), 95);
      return row;
    });
    for (const viewer of [userIds.otherStudent, userIds.moderator, userIds.admin]) {
      await asUser(viewer, async () => {
        for (const [table, column] of [["student_subjects", "id"], ["assessments", "student_subject_id"], ["grade_forecasts", "student_subject_id"], ["student_results", "id"]]) {
          assert.equal((await db.query(`select * from public.${table} where ${column} = $1`, [personal.id])).rows.length, 0, `${viewer} can read ${table}`);
        }
        assert.equal((await db.query("update public.assessments set exam = 0 where student_subject_id = $1 returning student_subject_id", [personal.id])).rows.length, 0);
        assert.equal((await db.query("delete from public.grade_forecasts where student_subject_id = $1 returning student_subject_id", [personal.id])).rows.length, 0);
        const missingGrant = await expectSqlError("delete from public.student_subjects where id = $1", [personal.id]);
        assert.match(missingGrant.message, /permission denied/);
        const insertPolicy = await expectSqlError("insert into public.grade_forecasts(student_subject_id, grade) values ($1, 'F')", [personal.id]);
        assert.match(insertPolicy.message, /row-level security/);
        const upsertPolicy = await expectSqlError(`
          insert into public.assessments(student_subject_id, exam) values ($1, 0)
          on conflict (student_subject_id) do update set exam = excluded.exam
        `, [personal.id]);
        assert.match(upsertPolicy.message, /row-level security/);
      });
    }
    await asUser(userIds.student, async () => {
      const { rows: [result] } = await db.query("select exam from public.student_results where id = $1", [personal.id]);
      assert.equal(Number(result.exam), 95);
      const { rows: forecasts } = await db.query("select grade from public.grade_forecasts where student_subject_id = $1", [personal.id]);
      assert.deepEqual(forecasts, [{ grade: "A" }]);
    });
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

  test("moderator edits the assigned group plan while group metadata and assignments stay administrator-only", async () => {
    await asUser(userIds.moderator, async () => {
      const item = await db.query(`
        insert into public.study_plan_items(group_id, subject_id, semester)
        values ('qa-group-a1', 'qa-math', 5) returning semester
      `);
      assert.deepEqual(item.rows, [{ semester: 5 }]);
      const foreignPlan = await expectSqlError("insert into public.study_plan_items(group_id, subject_id, semester) values ('qa-group-a2', 'qa-math', 5)");
      assert.match(foreignPlan.message, /row-level security/);
      const outside = await db.query("delete from public.study_plan_items where group_id = 'qa-group-a2' returning group_id");
      assert.equal(outside.rows.length, 0);
      const directory = await db.query("update public.study_groups set name = 'Forbidden' where id in ('qa-group-a1', 'qa-group-a2') returning id");
      assert.equal(directory.rows.length, 0);
      await expectSqlError("insert into public.moderator_groups(moderator_id, group_id) values ($1, 'qa-group-a2')", [userIds.moderator]);
      await expectSqlError("select public.admin_set_user_role($1, 'moderator')", [userIds.otherStudent]);
    });
    await asUser(userIds.admin, async () => {
      const { rows } = await db.query("select subject_id from public.study_plan_items where group_id = 'qa-group-a2'");
      assert.deepEqual(rows, [{ subject_id: "qa-other-a" }]);
      const groups = await db.query("select name from public.study_groups where id in ('qa-group-a1', 'qa-group-a2') order by id");
      assert.deepEqual(groups.rows, [{ name: "A1" }, { name: "A2" }]);
    });
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
      const { rows } = await db.query("update public.subjects set title = 'Forbidden' where id = 'qa-math' returning id");
      assert.equal(rows.length, 0);
      await expectSqlError("insert into public.subjects(program_id, title, credits) values ('qa-program-a', 'Forbidden', 1)");
      await expectSqlError("update public.user_roles set role = 'admin' where user_id = $1", [userIds.student]);
      await expectSqlError("insert into public.user_roles(user_id, role) values ($1, 'admin')", [userIds.student]);
      await expectSqlError("select public.admin_set_user_role($1, 'moderator')", [userIds.student], ["42501", "P0001"]);
      await expectSqlError("insert into public.moderator_groups(moderator_id, group_id) values ($1, 'qa-group-b')", [userIds.student]);
    });
    assert.equal((await db.query("select role from public.user_roles where user_id = $1", [userIds.student])).rows[0].role, "student");
    assert.equal((await db.query("select title from public.subjects where id = 'qa-math'")).rows[0].title, "Mathematics snapshot");
  });

  test("administrator RPC changes ordinary roles and protects self and administrator accounts", async () => {
    await asUser(userIds.admin, async () => {
      await expectSqlError("update public.user_roles set role = 'student' where user_id = $1", [userIds.admin]);
      await db.query("select public.admin_set_user_role($1, 'moderator')", [userIds.otherStudent]);
      await db.query("insert into public.moderator_groups(moderator_id, group_id) values ($1, 'qa-group-a2')", [userIds.otherStudent]);
      await expectSqlError("select public.admin_set_user_role($1, 'admin')", [userIds.student], ["42501", "23514", "P0001"]);
      await expectSqlError("select public.admin_set_user_role($1, 'student')", [userIds.admin], ["42501", "23514", "P0001"]);
      await expectSqlError("select public.admin_set_user_role($1, 'student')", [userIds.otherAdmin], ["42501", "23514", "P0001"]);
    });
    await asUser(userIds.otherStudent, async () => {
      assert.equal((await db.query("select role from public.user_roles where user_id = $1", [userIds.otherStudent])).rows[0].role, "moderator");
      const { rows } = await db.query("select group_id from public.moderator_groups where moderator_id = $1", [userIds.otherStudent]);
      assert.deepEqual(rows, [{ group_id: "qa-group-a2" }]);
    });
    await db.query("update public.user_roles set role = 'student' where user_id = $1", [userIds.otherAdmin]);
    await asUser(userIds.admin, async () => {
      await expectSqlError("select public.admin_set_user_role($1, 'student')", [userIds.admin], ["42501", "23514", "P0001"]);
    });
    assert.equal(Number((await db.query("select count(*) from public.user_roles where role = 'admin'")).rows[0].count), 1);
  });

  test("anonymous sessions cannot call role RPCs or read private records", async () => {
    await asUser(null, async () => {
      await expectSqlError("select public.admin_set_user_role($1, 'moderator')", [userIds.student], ["42501", "P0001"]);
      for (const table of ["profiles", "student_subjects", "assessments", "grade_forecasts", "student_results"]) {
        const denied = await expectSqlError(`select * from public.${table}`);
        assert.match(denied.message, /permission denied/);
      }
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

  test("saved assessment scores and grade points agree with JS at every threshold and for incomplete inputs", async () => {
    const fixture = join(projectRoot, "supabase", "tests", "assessment-cases.sql");
    await db.exec(await readFile(fixture, "utf8"));
    const { rows: cases } = await db.query("select * from qa_assessment_cases order by name");
    await asUser(userIds.student, async () => {
      const { id } = await insertPersonalSubject();
      const readResult = async () => (await db.query(`
        select rk1, rk2, exam, final_score, grade, grade_points
        from public.student_results where id = $1
      `, [id])).rows[0];

      assert.deepEqual(await readResult(), {
        rk1: null, rk2: null, exam: null, final_score: null, grade: null, grade_points: null,
      });
      assert.equal(calculateAssessmentResult(), null);

      for (const { name, rk1, rk2, exam, final_score, grade, grade_points } of cases) {
        await db.query(`
          insert into public.assessments(student_subject_id, rk1, rk2, exam)
          values ($1, $2, $3, $4) on conflict (student_subject_id) do update
          set rk1 = excluded.rk1, rk2 = excluded.rk2, exam = excluded.exam
        `, [id, rk1, rk2, exam]);
        const result = await readResult();
        assert.deepEqual(result, { rk1, rk2, exam, final_score: final_score?.toString() ?? null, grade, grade_points }, name);

        const js = calculateAssessmentResult({ rk1: numberOrNull(rk1), rk2: numberOrNull(rk2), exam: numberOrNull(exam) });
        assert.equal(js?.score ?? null, final_score, name);
        assert.equal(js?.grade ?? null, grade, name);
        assert.equal(js ? gradePoints[js.grade] : null, numberOrNull(grade_points), name);
      }
    });
  });

  test("weighted GPA and earned credits match SQL results without rounding the GPA", async () => {
    await db.exec(`
      insert into public.subjects(id, program_id, code, title, credits)
      values ('qa-gpa-b', 'qa-program-a', 'QA GPA B', 'Two-credit subject', 2)
    `);
    await asUser(userIds.student, async () => {
      const first = await insertPersonalSubject();
      const second = await insertPersonalSubject("qa-gpa-b");
      await insertPersonalSubject("qa-other-a");
      const checkGpa = async (gpa, gradedCredits, earnedCredits) => {
        const { rows: [totals] } = await db.query(`
          select sum(grade_points * credits) / nullif(sum(credits) filter (where grade is not null), 0) as gpa,
            sum(credits) as planned,
            coalesce(sum(credits) filter (where grade is not null), 0) as graded,
            coalesce(sum(credits) filter (where grade_points >= 1), 0) as earned
          from public.student_results where academic_year = '2026-2027' and semester = 3
        `);
        assert.equal(numberOrNull(totals.gpa), gpa);
        assert.equal(Number(totals.planned), 10);
        assert.equal(Number(totals.graded), gradedCredits);
        assert.equal(Number(totals.earned), earnedCredits);
        const { rows: subjects } = await db.query("select grade, credits from public.student_results where academic_year = '2026-2027' and semester = 3");
        const jsGpa = calculateGpa(subjects);
        if (gpa === null) assert.equal(jsGpa, null);
        else assert.ok(jsGpa !== null && Math.abs(jsGpa - gpa) < 1e-12, `Expected GPA ${gpa}, got ${jsGpa}`);
        assert.equal(subjects.filter(({ grade }) => earnsCredits(grade)).reduce((sum, { credits }) => sum + credits, 0), earnedCredits);
      };

      await checkGpa(null, 0, 0);
      await db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 95, 95, 95), ($2, 80, 80, 80)", [first.id, second.id]);
      await checkGpa(3.6, 5, 5);
      for (const [score, gpa, earned] of [[0, 1.2, 2], [25, 1.5, 2], [90, 3.402, 5]]) {
        await db.query("update public.assessments set rk1 = $1, rk2 = $1, exam = $1 where student_subject_id = $2", [score, first.id]);
        await checkGpa(gpa, 5, earned);
      }
    });
  });

  test("forecast writes and retries preserve factual scores and server-derived fields", async () => {
    await asUser(userIds.student, async () => {
      const { id } = await insertPersonalSubject();
      const saveScores = () => db.query("insert into public.assessments(student_subject_id, rk1, rk2, exam) values ($1, 4.1, 66.1, 8.6)", [id]);
      const { rows: [grants] } = await db.query(`select
        has_column_privilege('public.assessments', 'final_score', 'INSERT') as insert_score,
        has_column_privilege('public.assessments', 'final_score', 'UPDATE') as update_score,
        has_column_privilege('public.student_results', 'grade', 'UPDATE') as update_grade,
        has_column_privilege('public.student_results', 'grade_points', 'UPDATE') as update_points
      `);
      assert.deepEqual(grants, { insert_score: false, update_score: false, update_grade: false, update_points: false });
      await expectSqlError("insert into public.assessments(student_subject_id, final_score) values ($1, 100)", [id], ["42501", "428C9"]);
      await saveScores();
      await expectSqlError("update public.assessments set final_score = 100 where student_subject_id = $1", [id], ["42501", "428C9"]);
      await expectSqlError("update public.student_results set grade = 'A', grade_points = 4 where id = $1", [id], ["42501", "55000"]);

      const facts = () => db.query("select rk1, rk2, exam, final_score, grade, grade_points from public.student_results where id = $1", [id]);
      const before = (await facts()).rows[0];
      const saveForecast = "insert into public.grade_forecasts(student_subject_id, grade) values ($1, 'A')";
      await db.query(saveForecast, [id]);
      await expectSqlError(saveForecast, [id], ["23505"]);
      await db.query("update public.grade_forecasts set grade = 'B' where student_subject_id = $1", [id]);
      assert.deepEqual((await db.query("select grade from public.grade_forecasts where student_subject_id = $1", [id])).rows, [{ grade: "B" }]);
      assert.deepEqual((await facts()).rows, [before]);
      await db.query("delete from public.grade_forecasts where student_subject_id = $1", [id]);
      assert.deepEqual((await facts()).rows, [before]);
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
      await expectSqlError(`
        insert into public.student_subjects(subject_id, academic_year, semester)
        values ('qa-math', '2026-2027', 5), ('qa-math', '2026-2027', 3)
      `, [], ["23505"]);
      const retry = await db.query("select id, semester from public.student_subjects where subject_id = 'qa-math' order by semester");
      assert.deepEqual(retry.rows, [{ id: autumn.id, semester: 3 }, { id: spring.id, semester: 4 }]);
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
      await expectSqlError("insert into public.student_subjects(subject_id, academic_year, semester, student_id) values ('qa-math', '2027-2028', 3, $1)", [userIds.otherStudent]);
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
