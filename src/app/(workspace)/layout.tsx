import { Suspense, type ReactNode } from "react";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { SupabaseWorkspace } from "@/components/student/supabase-workspace";
import { isSupabaseMode } from "@/lib/data/mode";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg p-6"><p role="status">Загружаем учебное пространство…</p></main>}>
      {isSupabaseMode ? <SupabaseWorkspace>{children}</SupabaseWorkspace> : <WorkspaceGate>{children}</WorkspaceGate>}
    </Suspense>
  );
}
