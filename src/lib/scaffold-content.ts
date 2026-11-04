import { demoGroups, demoSemesters, demoStudent, demoStudyPlan, demoSummary, demoUniversities } from "@/lib/demo-data";
import type { RouteId } from "@/lib/site-routes";

type ScaffoldField = {
  label: string;
  value: string;
  type?: "text" | "email" | "number";
  disabled?: boolean;
};

type ScaffoldContent = {
  panelTitle: string;
  paragraphs: string[];
  rows?: { label: string; detail: string }[];
  fields?: ScaffoldField[];
  empty?: { title: string; description: string };
  action?: string;
  links: RouteId[];
};

const currentGroup = demoGroups.find((group) => group.id === demoStudent.groupId);

export const scaffoldContent = {
  universities: {
    panelTitle: "Каталог университетов",
    paragraphs: ["Выберите университет, чтобы перейти к его учебным направлениям."],
    rows: demoUniversities.map((university) => ({ label: university.name, detail: "Демонстрационная запись каталога" })),
    action: "Добавить университет",
    links: ["programs", "groups", "management"],
  },
  programs: {
    panelTitle: "Учебные направления",
    paragraphs: ["Каждое направление относится к университету и объединяет учебные группы."],
    rows: demoGroups.map((group) => ({ label: group.program, detail: demoUniversities.find((university) => university.id === group.universityId)?.name ?? "Университет" })),
    action: "Добавить направление",
    links: ["universities", "groups", "studyPlans", "management"],
  },
  groups: {
    panelTitle: "Учебные группы",
    paragraphs: ["Три группы демонстрационного каталога. Здесь появятся создание групп и назначение модераторов."],
    rows: demoGroups.map((group) => ({ label: group.name, detail: group.program + " · " + group.year + " курс · Предметов: " + group.subjectCount })),
    action: "Создать группу",
    links: ["studyPlans", "semesters", "programs", "management"],
  },
  semesters: {
    panelTitle: "Семестры учебного плана",
    paragraphs: ["Подготовлена структура учебных периодов. Предметы связываются с группой и семестром в учебном плане."],
    rows: demoSemesters.map((semester) => ({ label: semester + " семестр", detail: "Учебный период" })),
    action: "Добавить семестр",
    links: ["studyPlans", "groups", "management"],
  },
  studyPlans: {
    panelTitle: "Пример плана группы " + (currentGroup?.name ?? ""),
    paragraphs: ["Показан исходный учебный план группы. Публикация и изменение состава появятся позднее."],
    rows: demoStudyPlan.map((subject) => ({ label: subject.title, detail: subject.code + " · " + subject.semester + " семестр · Кредиты: " + subject.credits })),
    action: "Опубликовать план",
    links: ["groups", "semesters", "management", "setup"],
  },
  users: {
    panelTitle: "Пользователи и область модерации",
    paragraphs: ["Назначение модераторов относится к действиям администратора. В этом макете роли и доступ не изменяются."],
    rows: [
      { label: "Студент", detail: "Собственный учебный план и оценки" },
      { label: "Модератор", detail: "Предметы и планы назначенных групп" },
      { label: "Администратор", detail: "Группы, пользователи и назначение модераторов" },
    ],
    fields: [{ label: "Пример области модерации", value: currentGroup?.name ?? "Учебная группа" }],
    action: "Назначить модератора",
    links: ["groups", "history", "management"],
  },
  history: {
    panelTitle: "Результаты прошлых семестров",
    paragraphs: ["В архиве будут доступны учебный год, семестр, предметы, полученные кредиты и GPA."],
    empty: { title: "Архив пока пуст", description: "В этой версии можно посмотреть текущий учебный план. Записи прошлых семестров появятся в архиве." },
    links: ["dashboard", "subjects", "profile"],
  },
  progress: {
    panelTitle: "Исходный результат",
    paragraphs: ["Это статический пример текущего результата. История ещё не построена."],
    rows: [
      { label: "GPA семестра", detail: demoSummary.semesterGpa + " / 4.00 · исходный демопример" },
      { label: "Кредиты", detail: "Зачтено " + demoSummary.earnedCredits + " из " + demoSummary.plannedCredits },
    ],
    empty: { title: "История появится позже", description: "Здесь будет динамика результатов по семестрам." },
    links: ["goals", "simulator", "subjects", "dashboard"],
  },
  goals: {
    panelTitle: "Учебная цель",
    paragraphs: ["Подготовлен пример формы цели. Указанное значение не сохраняется и не меняет исходные оценки."],
    fields: [{ label: "Пример целевого GPA", value: "3.70", type: "number" }],
    rows: [{ label: "Исходный GPA", detail: demoSummary.overallGpa + " · демонстрационные данные" }],
    action: "Задать цель",
    links: ["progress", "simulator", "subjects"],
  },
  simulator: {
    panelTitle: "Сценарий будущих оценок",
    paragraphs: ["Симуляция будет отделена от настоящих оценок. Этот шаблон пока не рассчитывает прогноз."],
    rows: [{ label: "Исходный GPA", detail: demoSummary.overallGpa + " / 4.00 · статический демопример" }],
    fields: [
      { label: "Пример оценки будущего предмета", value: "A" },
      { label: "Пример количества кредитов", value: "3", type: "number" },
    ],
    empty: { title: "Прогноз ещё не рассчитан", description: "Результат будущей симуляции будет показан отдельно от исходного GPA." },
    action: "Посмотреть прогноз",
    links: ["progress", "goals", "subjects"],
  },
  chats: {
    panelTitle: "Учебные сообщества",
    paragraphs: ["Общение будет организовано по группе и предметам. Пока доступны предварительные макеты каналов."],
    rows: [
      { label: "Чат группы", detail: currentGroup?.name ?? "Учебная группа" },
      { label: "Чат предмета", detail: "Математика · MAT 201" },
    ],
    links: ["groupChat", "subjectChat", "profile"],
  },
  groupChat: {
    panelTitle: "Канал группы " + (currentGroup?.name ?? ""),
    paragraphs: ["Показан пример канала учебной группы. Сообщения в этом макете не отправляются."],
    empty: { title: "История сообщений пуста", description: "Здесь появится общение участников группы." },
    fields: [{ label: "Сообщение в группу", value: "", disabled: true }],
    action: "Отправить сообщение",
    links: ["chats", "subjectChat", "profile"],
  },
  subjectChat: {
    panelTitle: "Математика · MAT 201",
    paragraphs: ["Показан пример обсуждения предмета. Сообщения в этом макете не отправляются."],
    empty: { title: "Обсуждение ещё не началось", description: "Здесь появятся вопросы и сообщения участников предмета." },
    fields: [{ label: "Сообщение по предмету", value: "", disabled: true }],
    action: "Отправить сообщение",
    links: ["chats", "groupChat", "subjects"],
  },
  moderation: {
    panelTitle: "Жалобы и модерация",
    paragraphs: ["Модератор будет рассматривать обращения в назначенных группах. В макете нет настоящих жалоб или решений."],
    empty: { title: "Обращений пока нет", description: "Здесь будут обращения участников учебных чатов." },
    links: ["chats", "groups", "competitionManagement", "management"],
  },
  competitionManagement: {
    panelTitle: "Настройка соревнования",
    paragraphs: ["Подготовлен макет условий соревнования. Публикация и проверка результатов пока недоступны."],
    fields: [
      { label: "Название", value: "Учебный вызов" },
      { label: "Период", value: "Будет указан перед началом" },
      { label: "Правило начисления", value: "Баллы за проверяемые учебные задания" },
    ],
    action: "Создать соревнование",
    links: ["gamification", "moderation", "management"],
  },
} satisfies Record<string, ScaffoldContent>;

export type WorkspaceScaffoldId = keyof typeof scaffoldContent;
