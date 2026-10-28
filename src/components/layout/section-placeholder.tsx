import Link from "next/link";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader eyebrow="Учебное пространство" title={title} description={description} />
      <Card className="max-w-2xl">
        <Badge variant="outline">Раздел готовится</Badge>
        <h2 className="mt-6 text-xl font-semibold">Здесь скоро появится твой рабочий экран.</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Пока можно познакомиться с учебным пространством и примером результатов на главной странице.</p>
        <Link href="/" className={buttonStyles("secondary") + " mt-6"}>На главную <Icon name="arrow" className="size-4" /></Link>
      </Card>
    </>
  );
}
