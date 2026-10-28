# ScholarPath: общий договор по интерфейсу

## Задача текущего этапа

Собрать учебный UI-прототип ScholarPath на Next.js, TypeScript и Tailwind CSS. После работы участников должны быть готовы как минимум четыре отдельные страницы: `/dashboard`, `/setup`, `/subjects`, `/management`. Короткие страницы-заглушки в основе нужны для запуска общего каркаса; они не являются финальными страницами команды.

Страница `/management` — интерфейс управления каталогом и учебными планами для будущего подключения к серверу. Сегодня на ней тоже делаем только UI. Количество страниц не ограничено четырьмя: новые маршруты предварительно согласуем с Куралом, чтобы определить владельца и избежать пересечений.

Базовый репозиторий команды: `/home/arcnosixta/GPA_calc`. Перед работой прочитайте его `README.md`, `AGENTS.md`, этот договор и исходники общих экспортов. Примеры оформления берите из Tailwind CSS и адаптируйте к договору ниже.

## Единый стиль

- Белый с чёрным; нейтральные серые оттенки. Цветные акценты, градиенты и цветные статусы не используем.
- Интерфейс и пояснения для пользователя — на русском.
- Системный шрифт sans, без внешних шрифтов и загрузок.
- Карточки: `rounded-xl` (12 px); поля и кнопки: `rounded-lg` (8 px).
- Контейнер: `max-w-6xl`. Основные интервалы: `gap-4`, `gap-6`; внутренние отступы: 4, 6 или 8 по шкале Tailwind.
- Общие компоненты отвечают за базовые состояния, границы, скругления и фокус. Для компоновки страниц используйте обычные utility-классы Tailwind.

| Класс | Значение |
| --- | --- |
| `bg-background` | `#fafafa` |
| `bg-surface` | `#ffffff` |
| `bg-surface-muted` | `#f4f4f5` |
| `text-foreground` | `#18181b` |
| `text-muted` | `#62626b` |
| `border-border` | `#e4e4e7` |
| `bg-primary` | `#18181b` |
| `text-primary-foreground` | `#ffffff` |

Остальные классы — стандартные чёрно-бело-серые utility-классы Tailwind. Не вводите собственную глобальную палитру или конкурирующие стили компонентов.

## Оболочка и маршруты

Общий layout находится в `src/app/(workspace)/layout.tsx`. Он сам выводит `main`, sidebar и навигацию. Страница возвращает только своё содержимое: повторно добавлять `main`, sidebar или navbar не нужно.

Route group `(workspace)` не входит в URL. Например, файл `src/app/(workspace)/dashboard/page.tsx` открывается по `/dashboard`. Не создавайте дубликаты в `src/app/dashboard`.

## Владение файлами

| Владелец | Его область |
| --- | --- |
| Курал Нурдаулет | Общий каркас и навигация, глобальные стили, общий UI, типы, демоданные, конфигурация, зависимости и документация |
| Акылбек | `src/app/(workspace)/dashboard/**`, `src/app/(workspace)/setup/**`, `src/app/(workspace)/subjects/**`, `src/components/student/**` |
| Койшыман | `src/app/(workspace)/management/**`, `src/components/management/**` |
| Канат | Ручная проверка результата и отчёты об ошибках; исходники не изменяет |

Курал заранее создаёт короткие `page.tsx` в четырёх маршрутах. Акылбек и Койшыман заменяют свои заглушки готовыми страницами. После передачи основы Курал эти файлы параллельно не правит. Общие файлы и документацию участники не меняют: если общего экспорта не хватает или в нём ошибка, сообщите Куралу.

## Общие компоненты

Экспорты из `@/components/ui`:

| Экспорт | Точный интерфейс |
| --- | --- |
| `Button` | Нативные props элемента `button` + `variant?: 'primary' \| 'secondary' \| 'ghost'`. По умолчанию `type="button"`. Для отправки формы явно укажите `type="submit"`. |
| `buttonStyles` | `buttonStyles(variant?: 'primary' \| 'secondary' \| 'ghost')`: классы для `className`, например на `Link` из `next/link`. |
| `Card` | Нативные props элемента `div`. |
| `Badge` | Нативные props элемента `span` + `variant?: 'default' \| 'strong' \| 'outline'`. |
| `PageHeader` | `{ eyebrow?: string; title: string; description?: string; action?: ReactNode }`. |
| `EmptyState` | `{ title: string; description: string; action?: ReactNode }`. |
| `Input` | Нативные props элемента `input`. |
| `Select` | Нативные props элемента `select`. |
| `Field` | `{ label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }`. |

У `Field` ID подсказки — `htmlFor + '-hint'`, ID ошибки — `htmlFor + '-error'`. Вызывающий код сам ставит `aria-describedby` и `aria-invalid` на `Input` или `Select`. Подключайте в `aria-describedby` только реально отображаемые подсказки и ошибки. `id` поля должен совпадать с `htmlFor`.

Пример:

```tsx
import Link from 'next/link';
import { Button, Field, Input, buttonStyles } from '@/components/ui';

<Field label="Название предмета" htmlFor="subject-title" hint="Как в учебном плане">
  <Input id="subject-title" aria-describedby="subject-title-hint" />
</Field>
<Button variant="secondary">Показать предпросмотр</Button>
<Link href="/subjects" className={buttonStyles('primary')}>Мои предметы</Link>
```

Не придумывайте дополнительные props вроде `asChild`, `size` или `loading`: в договоре их нет. Ссылку не вкладывайте в `Button` и не вкладывайте кнопку в ссылку.

Отдельный экспорт `Icon` из `@/components/ui/icon` принимает:

```ts
{
  name: 'grid' | 'book' | 'layers' | 'settings' | 'arrow' | 'chevron'
    | 'check' | 'plus' | 'menu' | 'close' | 'cap';
  className?: string;
}
```

Не устанавливайте библиотеку иконок. Если иконка несёт смысл, обеспечьте текстовую подпись на её кнопке или ссылке.

## Общие типы и демонстрационные данные

Типы экспортируются из `@/lib/types`:

```ts
type Grade = 'A' | 'A−' | 'B+' | 'B' | 'B−' | 'C+' | 'C' | 'C−' | 'D+' | 'D' | 'F';

type Subject = {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  groupId: string;
  grade: Grade | null;
};

type Group = {
  id: string;
  name: string;
  program: string;
  year: number;
  subjectCount: number;
};

type Student = {
  name: string;
  initials: string;
  groupId: string;
  semester: number;
};
```

В оценках используется знак минуса `−`, например `A−`. Не заменяйте его дефисом при сопоставлении значений.

Экспорты из `@/lib/demo-data`:

- `demoStudent: Student`.
- `demoGroups: Group[]`.
- `demoSubjects: Subject[]` — общий демонстрационный каталог.
- `demoStudyPlan: Subject[]` — предметы из `demoSubjects` с ID `math`, `programming`, `english`; личный план для демонстрации.
- `demoSemesters: number[]`.
- `gradeOptions: Grade[]`.
- `demoSummary: { overallGpa: string; semesterGpa: string; plannedCredits: number; gradedCredits: number; earnedCredits: number; gradedSubjects: number; totalSubjects: number }`.

Во всех страницах используем один статический пример: A на 3 кредита, B на 2 кредита и один предмет без оценки на 3 кредита. Общий GPA и GPA семестра — `3.60`; в плане 8 кредитов, с оценкой 5, зачтено 5; оценены 2 из 3 предметов. Остальные предметы каталога в `demoSubjects` не имеют оценок. Не считайте весь каталог личным планом студента.

Сводка уже подготовлена. Не добавляйте расчёт GPA, не изменяйте общий массив и не подменяйте эти числа отдельными несогласованными примерами. Для локального предпросмотра создавайте отдельное состояние внутри своей области.

## Граница UI-прототипа

Сегодня не реализуем API, БД, Server Actions, авторизацию, сохранение данных, localStorage или расчёт GPA. Локальный `useState` разрешён для фильтров, выбора, раскрытия элементов, форм и явно обозначенного демонстрационного предпросмотра. Добавляйте `'use client'` только компонентам, которым нужна интерактивность.

Необязательно делать все возможные взаимодействия. Важнее законченные страницы и ясное назначение элементов: переход, выбор, раскрытие или демо-предпросмотр. Не оставляйте активные кнопки с обещанием действия, которое они не выполняют. Недоступное действие можно убрать либо явно обозначить как пока недоступное.

Не показывайте «Сохранено», «Аккаунт создан» или другие подтверждения реальной серверной операции. Если локальная форма демонстрирует результат, подпишите его как предпросмотр без сохранения. Ссылка на управление в демоверсии не является проверкой прав.

## Совместная работа

1. Курал готовит основу в ветке `codex/ui-foundation` и передаёт команде один базовый коммит.
2. Участники начинают именно от этого коммита в собственных клонах: Акылбек — `codex/student-ui`, Койшыман — `codex/management-ui`.
3. Каждый меняет только свою область. Не устанавливайте зависимости, не редактируйте shared-файлы, конфигурацию, данные или `docs`.
4. Перед передачей результата локально выполните `npm run lint` и `npm run build`; сообщите результаты и перечень изменённых файлов.
5. Без отдельного запроса не выполняйте push и не создавайте PR.
6. Курал объединяет работы, Канат проходит ручной чеклист из `docs/qa.md` и сообщает баги владельцам.

Основа и заглушки сами по себе не подтверждают готовность четырёх страниц. Итог принимаем после замены заглушек, интеграции и проверки.

## Референсы Tailwind

- [Sidebar Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/sidebar): боковая навигация на компьютере, компактная шапка и раскрываемое меню на телефоне.
- [Stats](https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/stats): число результата крупнее пояснения, GPA и показатели кредитов разделены по смыслу.
- [Form Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts): подпись над полем, подсказка под полем, ясные группы данных.
- [Theme variables](https://tailwindcss.com/docs/theme) и [Responsive design](https://tailwindcss.com/docs/responsive-design): общие токены и адаптивность.

Композиция ScholarPath реализована собственными компонентами. Для адаптивного скрытия компонента с собственным display используйте обёртку; не пытайтесь переопределить его конфликтующими классами `hidden` и `inline-flex` на одном элементе.
