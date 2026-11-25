import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.SCHOLARPATH_RLS_LIVE === "1";
const academicYear = "2199-2200";
const assignedGroup = "is-24-1";
const otherGroup = "vt-24-1";
const assignedPlan = { group_id: assignedGroup, subject_id: "math", semester: 8 };
const otherPlan = { group_id: otherGroup, subject_id: "networks", semester: 8 };
const forbiddenPlan = { group_id: otherGroup, subject_id: "systems", semester: 8 };
const noGrant = /permission denied for (table|relation|function|schema)/i;
const rowPolicy = /row.level security policy/i;

function jwtClaims(value) {
  try {
    return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function config() {
  let url;
  try {
    url = new URL(process.env.SCHOLARPATH_RLS_URL);
  } catch {
    throw new Error("Укажите SCHOLARPATH_RLS_URL для локального Supabase.");
  }
  assert.ok(url.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(url.hostname) && url.port
    && url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash,
  "SCHOLARPATH_RLS_URL должен содержать HTTP-адрес локального Supabase с портом.");
  const key = process.env.SCHOLARPATH_RLS_PUBLISHABLE_KEY ?? "";
  assert.ok(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || jwtClaims(key)?.role === "anon",
    "Укажите локальный publishable key или legacy anon key.");
  return { url: url.origin, key };
}

function createTestClient({ url, key }) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) }) },
  });
}

function dataOrFail(result, action) {
  const code = result.error?.code;
  const errorCode = /^[A-Za-z0-9_]{1,32}$/.test(code ?? "") ? ` (${code})` : "";
  assert.ok(!result.error, `Не выполнено действие «${action}»${errorCode}.`);
  return result.data;
}

async function expectRows(request, count, action) {
  const data = dataOrFail(await request, action);
  assert.ok(Array.isArray(data), `Ожидался набор строк для действия «${action}».`);
  assert.equal(data.length, count, `Число строк для действия «${action}».`);
  return data;
}

async function expectDenied(request, reason, action) {
  const { error } = await request;
  assert.ok(error?.code === "42501", `Ожидался отказ SQLSTATE 42501 для действия «${action}».`);
  assert.ok(reason.test(error.message), `Причина отказа отличается от ожидаемой для действия «${action}».`);
}

async function login(connection, name) {
  const email = process.env[`SCHOLARPATH_RLS_${name}_EMAIL`];
  const password = process.env[`SCHOLARPATH_RLS_${name}_PASSWORD`];
  assert.ok(email && password, `Укажите email и пароль локального тестового аккаунта ${name}.`);
  const client = createTestClient(connection);
  const data = dataOrFail(await client.auth.signInWithPassword({ email, password }), `вход ${name}`);
  const claims = jwtClaims(data.session?.access_token);
  assert.ok(data.user?.id && claims?.role === "authenticated" && claims.sub === data.user.id,
    `Ожидалась отдельная пользовательская сессия Auth ${name}.`);
  return { client, id: data.user.id };
}

const subjectPayload = (subject_id = "math", semester = 3) => ({ subject_id, academic_year: academicYear, semester });
const readRole = (account, id = account.id) => account.client.from("user_roles").select("role").eq("user_id", id);
const setRole = (account, id, role) => account.client.rpc("admin_set_user_role", { target_user_id: id, new_role: role });
const assignments = (account, moderatorId, groupId) => account.client.from("moderator_groups")
  .select("group_id").eq("moderator_id", moderatorId).eq("group_id", groupId);

describe("ScholarPath RLS через локальные Supabase Auth и Data API", { skip: !enabled, concurrency: false }, () => {
  let anon, a, b, moderator, admin, own, foreign, pending;
  let catalogFixtureReady = false;

  before(async () => {
    const connection = config();
    anon = createTestClient(connection);
    assert.equal(dataOrFail(await anon.rpc("backend_health"), "проверка локальной схемы"), "scholarpath-v1");

    a = await login(connection, "A");
    b = await login(connection, "B");
    moderator = await login(connection, "MODERATOR");
    admin = await login(connection, "ADMIN");
    assert.equal(new Set([a.id, b.id, moderator.id, admin.id]).size, 4, "Нужны четыре разных тестовых аккаунта.");
    for (const [account, role] of [[a, "student"], [b, "student"], [moderator, "moderator"], [admin, "admin"]]) {
      const [row] = await expectRows(readRole(account), 1, `проверка роли ${role}`);
      assert.equal(row.role, role);
    }
    await expectRows(assignments(moderator, moderator.id, assignedGroup), 1, "назначенная группа модератора");
    await expectRows(assignments(moderator, moderator.id, otherGroup), 0, "группа вне назначения модератора");

    for (const plan of [assignedPlan, otherPlan, forbiddenPlan]) {
      await expectRows(admin.client.from("study_plan_items").select("group_id").match(plan), 0, "пустой семестр для строк QA");
    }
    catalogFixtureReady = true;
    for (const account of [a, b]) {
      await expectRows(account.client.from("student_subjects").select("id").eq("academic_year", academicYear), 0,
        "исходное отсутствие личных строк QA");
    }

    const add = async (account, payload) => (await expectRows(
      account.client.from("student_subjects").insert(payload).select("id,student_id"), 1, "добавление своего предмета",
    ))[0];
    own = await add(a, subjectPayload());
    foreign = await add(b, subjectPayload());
    pending = await add(b, subjectPayload("math", 4));
    assert.ok(own.student_id === a.id && foreign.student_id === b.id && pending.student_id === b.id,
      "Владелец новой личной строки соответствует сессии Auth.");
    dataOrFail(await b.client.from("assessments").insert({ student_subject_id: foreign.id, rk1: 80, rk2: 80, exam: 80 }),
      "запись фактических баллов B");
    dataOrFail(await b.client.from("grade_forecasts").insert({ student_subject_id: foreign.id, grade: "A" }), "запись прогноза B");
  });

  after(async () => {
    if (!catalogFixtureReady) return;
    for (const plan of [assignedPlan, otherPlan, forbiddenPlan]) {
      dataOrFail(await admin.client.from("study_plan_items").delete().match(plan), "очистка строки учебного плана QA");
    }
  });

  test("Аноним лишён grant на чтение личного плана, баллов, прогноза и результатов", async () => {
    for (const table of ["student_subjects", "assessments", "grade_forecasts", "student_results"]) {
      await expectDenied(anon.from(table).select("*"), noGrant, `анонимный SELECT ${table}`);
    }
    await expectDenied(setRole({ client: anon }, a.id, "moderator"), noGrant, "анонимный вызов RPC назначения роли");
  });

  test("A сохраняет и перечитывает свои сырые баллы, итог и отдельный прогноз", async () => {
    const assessment = { student_subject_id: own.id, rk1: 4.1, rk2: 66.1, exam: 8.6 };
    dataOrFail(await a.client.from("assessments").insert(assessment), "INSERT своего балла");
    dataOrFail(await a.client.from("grade_forecasts").insert({ student_subject_id: own.id, grade: "A" }), "INSERT своего прогноза");
    const selectResult = () => a.client.from("student_results").select("rk1,rk2,exam,final_score,grade,grade_points").eq("id", own.id);
    const expected = { rk1: 4.1, rk2: 66.1, exam: 8.6, final_score: 25, grade: "FX", grade_points: 0.5 };
    const [full] = await expectRows(selectResult(), 1, "чтение своего результата");
    assert.deepEqual(full, expected);
    const scoreEdit = await a.client.from("assessments").update({ final_score: 100 }).eq("student_subject_id", own.id);
    const gradeEdit = await a.client.from("student_results").update({ grade: "A", grade_points: 4 }).eq("id", own.id);
    assert.ok(scoreEdit.error && gradeEdit.error, "Ожидался отказ при записи вычисляемых полей.");
    const [protectedResult] = await expectRows(selectResult(), 1, "сверка серверного результата после отказа");
    assert.deepEqual(protectedResult, expected);
    await expectRows(a.client.from("assessments").update({ exam: null }).eq("student_subject_id", own.id).select("exam"),
      1, "UPDATE своего балла");
    const [partial] = await expectRows(selectResult(), 1, "чтение результата с пустым экзаменом");
    assert.deepEqual(partial, { rk1: 4.1, rk2: 66.1, exam: null, final_score: null, grade: null, grade_points: null });
    const [forecast] = await expectRows(a.client.from("grade_forecasts").select("grade").eq("student_subject_id", own.id),
      1, "чтение прогноза после изменения фактических баллов");
    assert.equal(forecast.grade, "A");
    await expectRows(a.client.from("grade_forecasts").delete().eq("student_subject_id", own.id).select("grade"), 1, "DELETE своего прогноза");
  });

  test("RLS скрывает от A личные строки B и сохраняет их после UPDATE и DELETE", async () => {
    for (const [table, column] of [["student_subjects", "id"], ["student_results", "id"],
      ["assessments", "student_subject_id"], ["grade_forecasts", "student_subject_id"]]) {
      await expectRows(a.client.from(table).select("*").eq(column, foreign.id), 0, `SELECT чужой строки ${table}`);
      await expectRows(b.client.from(table).select("*").eq(column, foreign.id), 1, `SELECT своей строки ${table}`);
    }
    await expectRows(a.client.from("student_results").select("id").eq("student_id", b.id), 0, "SELECT результатов по ID владельца");
    await expectRows(b.client.from("student_results").select("id").eq("id", own.id), 0, "SELECT результата A пользователем B");
    await expectRows(a.client.from("student_results").select("id").eq("id", randomUUID()), 0, "SELECT по отсутствующему UUID");
    await expectRows(admin.client.from("student_results").select("id").eq("id", foreign.id), 0, "SELECT чужого балла администратором");
    await expectRows(a.client.from("assessments").update({ exam: 100 }).eq("student_subject_id", foreign.id).select("exam"),
      0, "UPDATE чужого балла скрывает строку");
    await expectRows(a.client.from("grade_forecasts").delete().eq("student_subject_id", foreign.id).select("grade"),
      0, "DELETE чужого прогноза скрывает строку");
    await expectDenied(a.client.from("student_subjects").delete().eq("id", foreign.id), noGrant, "DELETE чужого личного предмета");
    const [assessment] = await expectRows(b.client.from("assessments").select("rk1,rk2,exam,final_score").eq("student_subject_id", foreign.id),
      1, "сверка баллов владельцем B");
    const [forecast] = await expectRows(b.client.from("grade_forecasts").select("grade").eq("student_subject_id", foreign.id),
      1, "сверка прогноза владельцем B");
    assert.deepEqual(assessment, { rk1: 80, rk2: 80, exam: 80, final_score: 80 });
    assert.equal(forecast.grade, "A");
  });

  test("INSERT и UPSERT соблюдают права на владельца и ключи строк", async () => {
    await expectDenied(a.client.from("student_subjects").update({ student_id: b.id }).eq("id", own.id),
      noGrant, "UPDATE владельца своей записи");
    await expectDenied(a.client.from("student_subjects").insert({ ...subjectPayload("math", 4), student_id: b.id }),
      noGrant, "INSERT с подменой владельца");
    await expectDenied(a.client.from("assessments").insert({ student_subject_id: pending.id, rk1: 99 }),
      rowPolicy, "INSERT балла для чужого ID");
    await expectDenied(a.client.from("grade_forecasts").insert({ student_subject_id: pending.id, grade: "A" }),
      rowPolicy, "INSERT прогноза для чужого ID");
    await expectDenied(a.client.from("assessments").upsert({ student_subject_id: foreign.id, rk1: 99 }),
      noGrant, "UPSERT чужого балла пытается изменить первичный ключ");
    await expectDenied(a.client.from("assessments").upsert({ student_subject_id: own.id, rk1: 99 }),
      noGrant, "UPSERT своего балла пытается изменить первичный ключ");
    await expectDenied(a.client.from("assessments").upsert({ student_subject_id: pending.id, rk1: 99 }, { ignoreDuplicates: true }),
      rowPolicy, "UPSERT с разрешёнными INSERT-столбцами для чужого ID");
    await expectRows(b.client.from("assessments").select("rk1").eq("student_subject_id", pending.id), 0, "B сверяет отсутствие нового балла");
    await expectRows(b.client.from("grade_forecasts").select("grade").eq("student_subject_id", pending.id), 0, "B сверяет отсутствие нового прогноза");
    const [unchanged] = await expectRows(b.client.from("assessments").select("rk1").eq("student_subject_id", foreign.id),
      1, "B сверяет ранее сохранённый балл");
    assert.equal(unchanged.rk1, 80);
    const [plan] = await expectRows(a.client.from("student_subjects").select("student_id").eq("id", own.id), 1, "A сверяет владельца");
    assert.ok(plan.student_id === a.id, "Владелец своей записи остался A.");
  });

  test("Студент лишён права менять общий каталог, роли и назначения", async () => {
    const readSubject = () => expectRows(admin.client.from("subjects").select("credits").eq("id", "math"), 1, "сверка общего каталога");
    const [{ credits }] = await readSubject();
    const changedCredits = credits === 30 ? 29 : 30;
    try {
      await expectRows(a.client.from("subjects").update({ credits: changedCredits }).eq("id", "math").select("id"), 0,
        "UPDATE общего каталога скрывает строку");
      const [subject] = await readSubject();
      assert.equal(subject.credits, credits);
    } finally {
      const [subject] = await readSubject();
      if (subject.credits !== credits) {
        dataOrFail(await admin.client.from("subjects").update({ credits }).eq("id", "math"), "возврат исходных кредитов");
      }
    }
    await expectDenied(a.client.from("user_roles").update({ role: "moderator" }).eq("user_id", a.id), noGrant, "UPDATE роли студентом");
    await expectDenied(setRole(a, a.id, "moderator"), /administrator required/i, "вызов RPC назначения студентом");
    await expectDenied(a.client.from("moderator_groups").insert({ moderator_id: moderator.id, group_id: otherGroup }),
      rowPolicy, "INSERT назначения студентом");
    const [role] = await expectRows(readRole(admin, a.id), 1, "администратор сверяет роль A");
    assert.equal(role.role, "student");
    await expectRows(assignments(admin, moderator.id, otherGroup), 0, "администратор сверяет назначения модератора");
  });

  test("Модератор меняет учебный план только назначенной группы", async () => {
    await expectRows(moderator.client.from("study_plan_items").insert(assignedPlan).select("subject_id"), 1, "INSERT в назначенной группе");
    await expectRows(moderator.client.from("study_plan_items").delete().match(assignedPlan).select("subject_id"),
      1, "DELETE из назначенной группы");
    await expectDenied(moderator.client.from("study_plan_items").insert(forbiddenPlan), rowPolicy, "INSERT в чужой группе");
    await expectRows(admin.client.from("study_plan_items").insert(otherPlan).select("subject_id"), 1, "подготовка учебного плана чужой группы");
    await expectRows(moderator.client.from("study_plan_items").delete().match(otherPlan).select("subject_id"),
      0, "DELETE из чужой группы скрывает строку");
    await expectRows(admin.client.from("study_plan_items").select("subject_id").match(otherPlan), 1, "администратор сверяет чужую группу");
    await expectRows(admin.client.from("study_plan_items").select("subject_id").match(forbiddenPlan), 0, "администратор сверяет запрет INSERT");
    await expectDenied(setRole(moderator, a.id, "moderator"), /administrator required/i, "вызов RPC назначения модератором");
    await expectDenied(moderator.client.from("moderator_groups").insert({ moderator_id: moderator.id, group_id: otherGroup }),
      rowPolicy, "INSERT собственного назначения модератором");
    await expectRows(assignments(admin, moderator.id, otherGroup), 0, "администратор сверяет границы назначения");
  });

  test("Администратор назначает роль и группу, повтор не создаёт дубль", async () => {
    try {
      dataOrFail(await setRole(admin, b.id, "moderator"), "назначение роли B администратором");
      const [role] = await expectRows(readRole(b), 1, "B читает выданную роль");
      assert.equal(role.role, "moderator");
      const assignment = { moderator_id: b.id, group_id: otherGroup };
      await expectRows(admin.client.from("moderator_groups").insert(assignment).select("group_id"), 1, "назначение группы B администратором");
      const repeated = await admin.client.from("moderator_groups").insert(assignment);
      assert.ok(repeated.error?.code === "23505", "Ожидалось единственное назначение группы.");
      await expectRows(assignments(b, b.id, otherGroup), 1, "B читает выданное назначение");
    } finally {
      dataOrFail(await setRole(admin, b.id, "student"), "возврат исходной роли B");
      await expectRows(assignments(admin, b.id, otherGroup), 0, "группа снята вместе с ролью модератора");
    }
  });

  test("Параллельная запись и повтор оставляют один личный предмет", async () => {
    const payload = subjectPayload("programming");
    const insert = () => a.client.from("student_subjects").insert(payload).select("id");
    const responses = await Promise.all([insert(), insert()]);
    assert.equal(responses.filter(({ error }) => error === null).length, 1, "Ожидалась одна успешная параллельная запись.");
    assert.equal(responses.filter(({ error }) => error?.code === "23505").length, 1, "Ожидался один конфликт уникальности.");
    const [record] = await expectRows(a.client.from("student_subjects").select("id").match(payload), 1, "повторное чтение после конфликта");
    assert.ok((await insert()).error?.code === "23505", "Повтор записи завершается конфликтом уникальности.");
    const [retry] = await expectRows(a.client.from("student_subjects").select("id").match(payload), 1, "сверка после повторной записи");
    assert.ok(retry.id === record.id, "Повтор возвращает ту же личную запись.");
  });
});
