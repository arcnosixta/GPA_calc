import type { Metadata } from "next";
import { Suspense } from "react";
import { SubjectDetails } from "@/components/student/subject-details";
import { siteRoutes } from "@/lib/site-routes";

export const metadata: Metadata = { title: siteRoutes.subjectDetails.title };

type SubjectPageProps = { params: Promise<{ subjectId: string }> };

export default function Page({ params }: SubjectPageProps) {
  return (
    <Suspense fallback={<p role="status">Загружаем предмет…</p>}>
      <SubjectContent params={params} />
    </Suspense>
  );
}

async function SubjectContent({ params }: SubjectPageProps) {
  const { subjectId } = await params;
  return <SubjectDetails subjectId={subjectId} />;
}
