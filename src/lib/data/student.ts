import type { Insert, LetterGrade } from "@/lib/database";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAssessmentScore, type SubjectAssessment } from "@/components/student/integration-adapter";
import { invalid } from "./errors";
import { requireUser } from "./profile";

export async function readStudyData() {
  const { client, user } = await requireUser();
  const [results, forecasts, subjects, semesters, plans] = await Promise.all([
    client.from("student_results").select("*").eq("student_id", user.id).order("academic_year").order("semester"),
    client.from("grade_forecasts").select("*"),
    client.from("subjects").select("*").is("archived_at", null).order("title"),
    client.from("semesters").select("*").eq("is_active", true).order("number"),
    client.from("study_plan_items").select("*"),
  ]);
  if (results.error) throw results.error;
  if (forecasts.error) throw forecasts.error;
  if (subjects.error) throw subjects.error;
  if (semesters.error) throw semesters.error;
  if (plans.error) throw plans.error;
  return { results: results.data, forecasts: forecasts.data, subjects: subjects.data, semesters: semesters.data, plans: plans.data };
}
export type StudyData = Awaited<ReturnType<typeof readStudyData>>;
export type StudentResult = StudyData["results"][number];

export function validateYear(year: string) {
  if (!/^\d{4}-\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) invalid("Учебный год указывается как 2026-2027.");
}

export async function addSubject(subject_id: string, academic_year: string, semester: number) {
  validateYear(academic_year);
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) invalid("Выберите семестр.");
  const { client, user } = await requireUser();
  // Generated types cannot describe BEFORE INSERT defaults. These three fields
  // are the complete insert grant; the trigger supplies owner and snapshots.
  const payload = { subject_id, academic_year, semester } as Insert<"student_subjects">;
  const result = await client.from("student_subjects").insert(payload).select("*").single();
  if (!result.error) return result.data;
  if (result.error.code !== "23505") throw result.error;
  const existing = await client.from("student_subjects").select("*").eq("student_id", user.id)
    .eq("subject_id", subject_id).eq("academic_year", academic_year).eq("semester", semester).single();
  if (existing.error) throw existing.error;
  return existing.data;
}

export async function saveAssessment(id: string, scores: SubjectAssessment) {
  if (Object.values(scores).some((value) => value !== null && !isAssessmentScore(value))) invalid("Баллы должны быть от 0 до 100 или пустыми.");
  const { client, user } = await requireUser();
  const inserted = await client.from("assessments").insert({ student_subject_id: id, ...scores });
  if (inserted.error) {
    if (inserted.error.code !== "23505") throw inserted.error;
    // Upsert would also UPDATE the primary key, which the column grants forbid.
    const updated = await client.from("assessments").update(scores).eq("student_subject_id", id).select("student_subject_id").single();
    if (updated.error) throw updated.error;
  }
  const result = await client.from("student_results").select("*").eq("id", id).eq("student_id", user.id).single();
  if (result.error) throw result.error;
  return result.data;
}

export async function saveForecast(id: string, grade: LetterGrade | null) {
  const { client } = await requireUser();
  if (grade === null) {
    const deleted = await client.from("grade_forecasts").delete().eq("student_subject_id", id);
    if (deleted.error) throw deleted.error;
    return null;
  }
  const inserted = await client.from("grade_forecasts").insert({ student_subject_id: id, grade }).select("*").single();
  if (!inserted.error) return inserted.data;
  if (inserted.error.code !== "23505") throw inserted.error;
  const updated = await client.from("grade_forecasts").update({ grade }).eq("student_subject_id", id).select("*").single();
  if (updated.error) throw updated.error;
  return updated.data;
}

export async function readCalendars(universityId: string, academicYear: string) {
  validateYear(academicYear);
  const client = createBrowserSupabaseClient();
  const calendars = await client.from("academic_calendars").select("*").eq("university_id", universityId).eq("academic_year", academicYear);
  if (calendars.error) throw calendars.error;
  if (!calendars.data.length) return { calendars: [], terms: [], sources: [] };
  const [terms, sources] = await Promise.all([
    client.from("calendar_terms").select("*").in("calendar_id", calendars.data.map((item) => item.id)),
    client.from("academic_sources").select("*").eq("university_id", universityId).eq("academic_year", academicYear),
  ]);
  if (terms.error) throw terms.error;
  if (sources.error) throw sources.error;
  return { calendars: calendars.data, terms: terms.data, sources: sources.data };
}
