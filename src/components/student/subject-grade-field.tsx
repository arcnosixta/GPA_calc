import { Field, Select } from "@/components/ui";
import type { Grade, Subject } from "@/lib/types";
import { gradeOptions } from "./integration-adapter";

export function SubjectGradeField({ subject, setGrade, fieldId = `grade-${subject.id}` }: {
  subject: Subject;
  setGrade: (id: string, grade: Grade | null) => void;
  fieldId?: string;
}) {
  return (
    <Field label={subject.code ? `Итоговая оценка · ${subject.code}` : "Итоговая оценка"} htmlFor={fieldId}>
      <Select id={fieldId} value={subject.grade ?? ""} onChange={(event) => {
        const grade = gradeOptions.find((option) => option === event.target.value) ?? null;
        setGrade(subject.id, grade);
      }}>
        <option value="">Без оценки</option>
        {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
      </Select>
    </Field>
  );
}
