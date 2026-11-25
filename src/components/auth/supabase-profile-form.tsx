"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { dataErrorMessage } from "@/lib/data/errors";
import { saveProfile, type Account, type ProfileCatalog } from "@/lib/data/profile";

export function SupabaseProfileForm({ account, catalog, onSaved }: { account: Account; catalog: ProfileCatalog; onSaved: (profile: Account["profile"]) => void }) {
  const group = catalog.groups.find((item) => item.id === account.profile.group_id);
  const [university, setUniversity] = useState(catalog.programs.find((item) => item.id === group?.program_id)?.university_id ?? "");
  const [groupId, setGroupId] = useState(group?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const groups = catalog.groups.filter((item) => catalog.programs.some((program) => program.id === item.program_id && program.university_id === university));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await saveProfile(String(fields.get("firstName")), String(fields.get("lastName")), university, groupId);
      onSaved(saved); setMessage("Профиль сохранён в аккаунте.");
    } catch (error) { setError(dataErrorMessage(error)); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-4">
    <fieldset disabled={busy} className="space-y-4">
      <Field htmlFor="first-name" label="Имя"><Input id="first-name" name="firstName" autoComplete="given-name" defaultValue={account.profile.first_name} required maxLength={60} autoFocus={!account.profile.first_name} /></Field>
      <Field htmlFor="last-name" label="Фамилия"><Input id="last-name" name="lastName" autoComplete="family-name" defaultValue={account.profile.last_name} required maxLength={60} /></Field>
      <Field htmlFor="university" label="Университет"><Select id="university" required value={university} onChange={(event) => { setUniversity(event.target.value); setGroupId(""); }}>
        <option value="">Выберите вуз</option>{catalog.universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select></Field>
      <Field htmlFor="study-group" label="Группа"><Select id="study-group" required value={groupId} onChange={(event) => setGroupId(event.target.value)}>
        <option value="">Выберите группу</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select></Field>
      {university && !groups.length && <p>В этом вузе пока нет групп. Обратитесь к модератору каталога.</p>}
      <Button type="submit" disabled={!groups.length || busy}>{busy ? "Сохраняем…" : "Сохранить профиль"}</Button>
    </fieldset>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </form>;
}
