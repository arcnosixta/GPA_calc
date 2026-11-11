export type AcademicCalendarId = "approximate" | "yessenov" | "buketov";

type AcademicCalendarDefinition = {
  label: string;
  rk1Weeks: string;
  rk2Weeks: string;
  source?: { label: string; url: string };
};

export const academicCalendars: Record<AcademicCalendarId, AcademicCalendarDefinition> = {
  approximate: {
    label: "Ориентировочный календарь",
    rk1Weeks: "7-я неделя",
    rk2Weeks: "14-я неделя",
  },
  yessenov: {
    label: "Yessenov University",
    rk1Weeks: "7-я неделя",
    rk2Weeks: "15-я неделя",
    source: {
      label: "Академический календарь Yessenov University",
      url: "https://yu.edu.kz/ru/akademicheskij-kalendar/",
    },
  },
  buketov: {
    label: "Университет имени Е. А. Букетова",
    rk1Weeks: "Недели 6–8",
    rk2Weeks: "Недели 12–14",
    source: {
      label: "Правила оценивания Университета Букетова",
      url: "https://buketov.edu.kz/ru/page/for_teaching_students",
    },
  },
};

export const defaultAcademicCalendarId: AcademicCalendarId = "approximate";

export function isAcademicCalendarId(value: unknown): value is AcademicCalendarId {
  return typeof value === "string" && Object.hasOwn(academicCalendars, value);
}
