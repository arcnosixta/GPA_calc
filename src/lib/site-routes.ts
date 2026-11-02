export type RoutePhase = "mvp" | "after-mvp" | "after-chats";
export type RouteOwner = "kural" | "akylbek" | "koishyman";

type SiteRoute = {
  path: string;
  title: string;
  summary: string;
  phase: RoutePhase;
  owner: RouteOwner;
  section: "public" | "account" | "study" | "management" | "progress" | "community";
};

export const siteRoutes = {
  home: { path: "/", title: "Твой учебный путь", summary: "Главная страница ScholarPath.", phase: "mvp", owner: "kural", section: "public" },
  dashboard: { path: "/dashboard", title: "Личный кабинет", summary: "GPA, кредиты и предметы текущего семестра.", phase: "mvp", owner: "akylbek", section: "study" },
  setup: { path: "/setup", title: "Выбор учебного плана", summary: "Группа или самостоятельный выбор предметов.", phase: "mvp", owner: "akylbek", section: "study" },
  subjects: { path: "/subjects", title: "Мои предметы", summary: "Семестры, кредиты и собственные оценки.", phase: "mvp", owner: "akylbek", section: "study" },
  management: { path: "/management", title: "Управление", summary: "Просмотр каталога и форма предмета.", phase: "mvp", owner: "koishyman", section: "management" },
  login: { path: "/login", title: "Вход", summary: "Вход в учебное пространство.", phase: "mvp", owner: "akylbek", section: "account" },
  register: { path: "/register", title: "Регистрация", summary: "Создание студенческого аккаунта.", phase: "mvp", owner: "akylbek", section: "account" },
  verifyEmail: { path: "/verify-email", title: "Подтверждение email", summary: "Экран подтверждения адреса электронной почты.", phase: "mvp", owner: "akylbek", section: "account" },
  forgotPassword: { path: "/forgot-password", title: "Восстановление доступа", summary: "Запрос восстановления пароля.", phase: "mvp", owner: "akylbek", section: "account" },
  resetPassword: { path: "/reset-password", title: "Новый пароль", summary: "Экран установки нового пароля.", phase: "mvp", owner: "akylbek", section: "account" },
  logout: { path: "/logout", title: "Выход", summary: "Экран завершения сеанса.", phase: "mvp", owner: "akylbek", section: "account" },
  profile: { path: "/profile", title: "Профиль", summary: "Данные студента и выбранная группа.", phase: "mvp", owner: "akylbek", section: "study" },
  groups: { path: "/management/groups", title: "Учебные группы", summary: "Группы, программы и назначенные модераторы.", phase: "mvp", owner: "koishyman", section: "management" },
  semesters: { path: "/management/semesters", title: "Семестры", summary: "Семестры и структура обучения.", phase: "mvp", owner: "koishyman", section: "management" },
  studyPlans: { path: "/management/study-plans", title: "Учебные планы групп", summary: "Связь групп, семестров, предметов и кредитов.", phase: "mvp", owner: "koishyman", section: "management" },
  users: { path: "/management/users", title: "Пользователи и роли", summary: "Назначение модераторов и областей ответственности.", phase: "mvp", owner: "koishyman", section: "management" },
  history: { path: "/management/history", title: "История изменений", summary: "Журнал административных действий.", phase: "mvp", owner: "koishyman", section: "management" },
  progress: { path: "/progress", title: "Прогресс", summary: "История успеваемости и личное планирование.", phase: "after-mvp", owner: "akylbek", section: "progress" },
  goals: { path: "/progress/goals", title: "Учебные цели", summary: "Личная цель по результатам обучения.", phase: "after-mvp", owner: "akylbek", section: "progress" },
  simulator: { path: "/progress/simulator", title: "Симулятор оценок", summary: "Будущие оценки отдельно от реальных результатов.", phase: "after-mvp", owner: "akylbek", section: "progress" },
  chats: { path: "/chats", title: "Чаты", summary: "Общение по группе и предметам.", phase: "after-mvp", owner: "akylbek", section: "community" },
  groupChat: { path: "/chats/group", title: "Чат группы", summary: "Макет общего пространства учебной группы.", phase: "after-mvp", owner: "akylbek", section: "community" },
  subjectChat: { path: "/chats/subject", title: "Чат предмета", summary: "Макет обсуждения учебного предмета.", phase: "after-mvp", owner: "akylbek", section: "community" },
  moderation: { path: "/management/moderation", title: "Модерация", summary: "Жалобы и инструменты модерации общения.", phase: "after-mvp", owner: "koishyman", section: "management" },
  competitions: { path: "/competitions", title: "Соревнования", summary: "Добровольные учебные задания и правила участия.", phase: "after-chats", owner: "akylbek", section: "community" },
  challenge: { path: "/competitions/challenge", title: "Учебное задание", summary: "Условия задания и порядок проверки результата.", phase: "after-chats", owner: "akylbek", section: "community" },
  achievements: { path: "/achievements", title: "Достижения", summary: "Личные награды за проверенные учебные результаты.", phase: "after-chats", owner: "akylbek", section: "community" },
  leaderboard: { path: "/leaderboard", title: "Рейтинг", summary: "Добровольный рейтинг по проверенным учебным баллам.", phase: "after-chats", owner: "akylbek", section: "community" },
  competitionManagement: { path: "/management/competitions", title: "Управление соревнованиями", summary: "Правила, период и проверка учебных заданий.", phase: "after-chats", owner: "koishyman", section: "management" },
} as const satisfies Record<string, SiteRoute>;

export type RouteId = keyof typeof siteRoutes;

export const phaseLabels: Record<RoutePhase, string> = {
  mvp: "MVP",
  "after-mvp": "После MVP",
  "after-chats": "После чатов",
};

// Четыре существующих основных пункта остаются в AppShell.
// Все остальные страницы доступны через эти группы.
export const navigationSections: { title: string; routes: RouteId[] }[] = [
  { title: "Аккаунт", routes: ["profile", "login", "register", "verifyEmail", "forgotPassword", "resetPassword", "logout"] },
  { title: "Управление", routes: ["groups", "semesters", "studyPlans", "users", "history", "moderation", "competitionManagement"] },
  { title: "Прогресс", routes: ["progress", "goals", "simulator"] },
  { title: "Сообщество", routes: ["chats", "groupChat", "subjectChat", "competitions", "challenge", "achievements", "leaderboard"] },
];
