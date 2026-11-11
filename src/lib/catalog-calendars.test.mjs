import assert from "node:assert/strict";
import { test } from "node:test";
import { browser as createTestBrowser } from "./browser-test-runtime.mjs";

const catalogKey = "scholarpath.demo-catalog.v1";
const progressKey = "scholarpath.student-progress.v1";
const esilId = "esil-2026-2027-bachelor-2026";
const demoId = "central-2026-2027-example";
const admin = { email: "admin@example.com", role: "admin", profile: null };
const moderator = { ...admin, role: "moderator" };
const plain = (value) => JSON.parse(JSON.stringify(value));

function browser(data) {
  const runtime = createTestBrowser(data);
  return {
    ...runtime,
    catalog: runtime.loadProject("src/lib/demo-catalog.ts"),
    calendars: runtime.loadProject("src/lib/catalog-calendars.ts"),
  };
}

function calendar(runtime, id = esilId) {
  return runtime.catalog.useDemoCatalog().academicCalendars.find((item) => item.id === id);
}
function edit(record) {
  return { scope: record.scope, terms: plain(record.terms) };
}

test("ESIL: шесть опубликованных диапазонов, область применения и проверенный источник", () => {
  const runtime = browser();
  const record = calendar(runtime);
  assert.equal(record.universityId, "esil");
  assert.equal(record.academicYear, "2026-2027");
  assert.equal(record.status, "official");
  assert.match(record.scope, /2026.*4.*1 курс/);
  assert.deepEqual(plain(record.terms.flatMap((term) => [term.period, term.rk1, term.rk2].map(({ start, end }) => [start, end]))), [
    ["2026-09-01", "2026-12-11"], ["2026-10-19", "2026-10-23"], ["2026-12-07", "2026-12-11"],
    ["2027-01-25", "2027-05-10"], ["2027-03-16", "2027-03-20"], ["2027-05-03", "2027-05-10"],
  ]);
  assert.deepEqual(plain(record.terms.map((term) => term.id)), [`${esilId}-autumn`, `${esilId}-spring`]);
  const source = runtime.catalog.useDemoCatalog().academicSources.find((item) => item.id === record.sourceId);
  assert.equal(source.checkedAt, "2026-11-11");
  assert.equal(source.academicYear, record.academicYear);
  assert.equal(source.scope, record.scope);
  assert.match(source.url, /^https:\/\/esil\.edu\.kz\/.*\.pdf#page=3$/);
  assert.equal(calendar(runtime, demoId).status, "demo");
  assert.equal(calendar(runtime, demoId).sourceId, null);
});

test("форматирование сохраняет диапазон дат или недель, отсутствие срока явно обозначено", () => {
  const { formatCalendarRange } = browser().calendars;
  assert.equal(formatCalendarRange(null), "Срок не указан");
  assert.equal(formatCalendarRange({ kind: "weeks", start: 6, end: 8 }), "Недели 6–8");
  assert.equal(formatCalendarRange({ kind: "weeks", start: 7, end: 7 }), "7-я неделя");
  assert.equal(formatCalendarRange({ kind: "dates", start: "2026-10-19", end: "2026-10-23" }), "19.10.2026 — 23.10.2026");
});

test("проверка отклоняет невозможные даты, обратные диапазоны и неверный порядок РК", () => {
  const runtime = browser();
  const original = calendar(runtime).terms;
  const cases = [
    (terms) => { terms[0].rk1.start = "2026-02-30"; },
    (terms) => { terms[0].rk1.start = "2026-10-24"; },
    (terms) => { terms[0].rk1 = { kind: "weeks", start: 7.5, end: 8 }; },
    (terms) => { terms[0].rk1 = { kind: "weeks", start: 0, end: 8 }; },
    (terms) => { terms[0].rk1 = { kind: "weeks", start: 7, end: 54 }; },
    (terms) => { terms[0].rk1.start = "2026-08-31"; },
    (terms) => { terms[0].rk2.start = terms[0].rk1.end; },
    (terms) => { terms[1].season = "autumn"; },
    (terms) => { terms[1].id = terms[0].id; },
    (terms) => { terms.pop(); },
  ];
  assert.equal(runtime.calendars.validateCalendarTerms(original), null);
  for (const change of cases) {
    const terms = plain(original);
    change(terms);
    assert.equal(typeof runtime.calendars.validateCalendarTerms(terms), "string");
  }
  const unknownDates = original.map((term) => ({ ...term, period: null, rk1: null, rk2: null }));
  assert.equal(runtime.calendars.validateCalendarTerms(unknownDates), null);
});

test("старый каталог дополняется календарями без потери пользовательских данных", () => {
  const before = plain(browser().catalog.useDemoCatalog());
  delete before.academicCalendars;
  delete before.academicSources;
  before.universities = before.universities.filter((item) => item.id !== "esil");
  before.subjects[0].credits = 11;
  before.groups[0].name = "Моя группа";
  before.semesters[0].active = false;
  const runtime = browser(new Map([[catalogKey, JSON.stringify({ version: 1, data: before })]]));
  const after = plain(runtime.catalog.useDemoCatalog());
  for (const key of Object.keys(before).filter((key) => key !== "universities")) assert.deepEqual(after[key], before[key], key);
  assert.deepEqual(after.universities.filter((item) => item.id !== "esil"), before.universities);
  assert.equal(after.universities.filter((item) => item.id === "esil").length, 1);
  assert.ok(after.academicCalendars.some((item) => item.id === esilId));
});

test("администратор меняет ESIL, модератор только свой вуз, студент и отсутствие сеанса запрещены", () => {
  const runtime = browser();
  for (const session of [null, undefined, { ...admin, role: "student" }, moderator]) {
    assert.equal(runtime.catalog.updateAcademicCalendar(session, esilId, edit(calendar(runtime))).ok, false);
  }
  assert.equal(runtime.catalog.updateAcademicCalendar(moderator, demoId, edit(calendar(runtime, demoId))).ok, true);
  assert.equal(runtime.catalog.updateAcademicCalendar(admin, esilId, edit(calendar(runtime))).ok, true);
  assert.equal(runtime.catalog.updateDemoUser(admin, "demo-moderator", { role: "student", groupIds: [] }).ok, true);
  assert.equal(runtime.catalog.updateAcademicCalendar(moderator, demoId, edit(calendar(runtime, demoId))).ok, false);
});

test("локальная правка переживает перезагрузку и не выдаётся за официальный документ", () => {
  const runtime = browser();
  const initial = calendar(runtime);
  const input = edit(initial);
  input.terms[0].rk1.start = "2026-10-20";
  assert.equal(runtime.catalog.updateAcademicCalendar(admin, esilId, input).ok, true);
  const reloaded = calendar(browser(runtime.data));
  assert.equal(reloaded.terms[0].rk1.start, "2026-10-20");
  assert.equal(reloaded.status, "local");
  assert.equal(reloaded.sourceId, initial.sourceId);
  input.terms[0].rk1.start = "2026-10-21";
  assert.equal(calendar(runtime).terms[0].rk1.start, "2026-10-20", "Сохранённые данные не зависят от объекта формы");
});

test("ошибка формы или замена стабильного ID не записывает изменения", () => {
  const runtime = browser();
  const initial = plain(runtime.catalog.useDemoCatalog());
  for (const change of [
    (input) => { input.scope = " "; },
    (input) => { input.scope = "x".repeat(241); },
    (input) => { input.terms[0].id = "подменённый-id"; },
    (input) => { input.terms[0].rk1.end = "2026-10-18"; },
    (input) => {
      for (const term of input.terms) {
        for (const range of [term.period, term.rk1, term.rk2]) {
          if (range?.kind === "dates") {
            range.start = range.start.replace("2026", "2030").replace("2027", "2031");
            range.end = range.end.replace("2026", "2030").replace("2027", "2031");
          }
        }
      }
    },
  ]) {
    const input = edit(calendar(runtime));
    change(input);
    assert.equal(runtime.catalog.updateAcademicCalendar(admin, esilId, input).ok, false);
    assert.deepEqual(plain(runtime.catalog.useDemoCatalog()), initial);
  }
  assert.equal(runtime.data.has(catalogKey), false);
});

test("повреждённый календарь восстанавливается отдельно, каталог предметов сохраняется", () => {
  const saved = plain(browser().catalog.useDemoCatalog());
  saved.subjects[0].credits = 11;
  saved.academicCalendars[0].terms = [{ season: "autumn" }];
  const runtime = browser(new Map([[catalogKey, JSON.stringify({ version: 1, data: saved })]]));
  assert.equal(runtime.catalog.useDemoCatalog().subjects[0].credits, 11);
  assert.equal(calendar(runtime).terms[0].rk1.start, "2026-10-19");
  assert.equal(runtime.calendars.isCatalogAcademicCalendar({ ...calendar(runtime), academicYear: "2026-2028" }), false);
});

test("существующий личный план сохраняет оценки и кредиты после изменения каталога и перезагрузки", () => {
  const email = "existing-student@example.com";
  const profile = { firstName: "Демо", lastName: "Студент", universityId: "central", groupId: "is-24-1" };
  const subjects = [
    { id: "math", code: "MAT 201", title: "Математика", credits: 3, semester: 3, groupId: "is-24-1", grade: "A" },
    { id: "programming", code: "CS 201", title: "Программирование", credits: 2, semester: 3, groupId: "is-24-1", grade: "B" },
  ];
  const progress = JSON.stringify({ [email]: { subjects, forecast: {}, calendarId: "approximate", assessments: {} } });
  const runtime = browser(new Map([
    ["scholarpath.demo-session.v2", JSON.stringify({ active: { email, role: "student" }, profiles: { [email]: profile } })],
    [progressKey, progress],
  ]));
  const personalPath = "src/components/student/personal-plan.ts";
  assert.deepEqual(plain(runtime.loadProject(personalPath).usePersonalPlan().subjects), subjects);
  const math = runtime.catalog.useDemoCatalog().subjects.find((subject) => subject.id === "math");
  assert.equal(runtime.catalog.saveCatalogSubject(admin, { ...math, credits: 12 }, math.id).ok, true);
  assert.equal(runtime.catalog.updateAcademicCalendar(admin, esilId, edit(calendar(runtime))).ok, true);
  const reloaded = browser(runtime.data);
  assert.equal(reloaded.catalog.useDemoCatalog().subjects.find((subject) => subject.id === "math").credits, 12);
  assert.deepEqual(plain(reloaded.loadProject(personalPath).usePersonalPlan().subjects), subjects);
  assert.equal(runtime.data.get(progressKey), progress, "Каталог не переписывает личные записи");
});
