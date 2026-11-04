"use client";

import { useState } from "react";
import { Button, EmptyState } from "@/components/ui";
import { archiveCatalogSubject, demoModeratorName, getManagedGroupIds, useDemoCatalog } from "@/lib/demo-catalog";
import { useDemoSession } from "@/lib/demo-session";
import type { Subject } from "@/lib/types";
import { SubjectCatalog } from "./subject-catalog";
import { SubjectForm } from "./subject-form";

export function ManagementCatalog() {
  const session = useDemoSession();
  const catalog = useDemoCatalog();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [message, setMessage] = useState("");
  const groupIds = getManagedGroupIds(session, catalog);

  if (session === undefined) return <p role="status">Загружаем демосеанс…</p>;
  if (!session || session.role === "student") return <EmptyState title="Каталог доступен сотрудникам" description="Ваш учебный архив находится в разделе «Управление · архив»." />;

  function clearEditor() {
    setEditing(null);
    setFormVersion((version) => version + 1);
    document.getElementById("catalog-search")?.focus();
  }

  function archive(subject: Subject) {
    const result = archiveCatalogSubject(session, subject.id);
    if (!result.ok) { setMessage(result.error ?? "Не удалось архивировать предмет."); return; }
    if (editing?.id === subject.id) clearEditor();
    setMessage(`«${subject.title}» перенесён в архив каталога этой вкладки. Старые планы, оценки и зафиксированные кредиты сохранены.`);
    document.getElementById("catalog-search")?.focus();
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-6">
        <p className="font-semibold">Локальный демокаталог</p>
        <p className="mt-2 text-muted">Изменения остаются в текущей вкладке при переходах, обновлении и смене демороли. На сервер данные не отправляются.</p>
        {session.role === "moderator" && <p className="mt-2 text-muted">Демообласть модератора — назначенные группы записи «{demoModeratorName}». Назначения меняет администратор в разделе пользователей.</p>}
      </div>
      <p role="status" className="text-sm leading-6">{message}</p>
      <SubjectCatalog onEdit={(subject) => {
        setEditing(subject);
        setFormVersion((version) => version + 1);
        setMessage("");
      }} onArchive={archive} />
      {groupIds.length === 0 ? (
        <EmptyState title="Нет назначенных групп" description="Администратор может назначить группы демонстрационной записи модератора. После этого станут доступны предметы и планы." />
      ) : (
        <div className="space-y-4">
          {editing && <Button variant="secondary" onClick={clearEditor}>Отменить редактирование</Button>}
          <SubjectForm key={formVersion} subject={editing} onSaved={() => {
            setMessage(editing ? "Изменения предмета применены в каталоге этой вкладки. Старые оценки и кредиты личного плана не изменены." : "Предмет добавлен в каталог и план группы в этой вкладке.");
            clearEditor();
            document.getElementById("catalog-search")?.focus();
          }} />
        </div>
      )}
    </div>
  );
}
