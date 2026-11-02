# ScholarPath: общий договор по интерфейсу

## Задача текущего этапа

Актуальная задача на 2–8 ноября 2026 — завершить frontend на демоданных по [плану недели](frontend-week.md). Курал подготовил архитектуру 29 маршрутов; исходные пять страниц сохраняются,24 новые являются минимальными шаблонами. Их дорабатывают владельцы по трём промптам с суффиксом `-week.md`.

Источник требований — README, источник URL и этапов — `src/lib/site-routes.ts`. Наличие макета не запускает этап продукта: прогресс и чаты остаются «После MVP», соревнования — «После чатов». Серверная часть не входит в эту frontend-неделю.

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

## Оболочки, маршруты и владение

- `src/app/layout.tsx`: HTML, русский язык, метаданные и глобальные стили.
- `src/app/(workspace)/layout.tsx`: `AppShell`, меню и единственный `main` для рабочих страниц.
- `src/app/(auth)/layout.tsx`: отдельная `AuthLayout`, без рабочего sidebar.
- `src/lib/site-routes.ts`:29URL, заголовки, этапы, владельцы и группы навигации.
- `src/components/layout/route-scaffold.tsx` и `src/lib/scaffold-content.ts`: стартовый шаблон 18 новых рабочих страниц.
- `src/components/auth/auth-scaffold.tsx`: шесть стартовых экранов аккаунта.
- `src/components/layout/workspace-sections.tsx`: дополнительные группы общего меню.

Названия групп `(workspace)` и `(auth)` в URL не входят. Не создавайте одинаковые маршруты внутри и вне групп. Страницы возвращают только содержимое, общие `main`/sidebar/navbar не повторяются.

| Владелец | Область |
| --- | --- |
| Курал | `/`, реестр, layouts, общий UI, стили, типы и демоданные, конфигурация, документация и интеграция |
| Акылбек | Все auth `page.tsx`, профиль, dashboard/setup/subjects, progress, chats, competitions, achievements, leaderboard; локальные components/auth, student, progress, community |
| Койшыман | Все management `page.tsx` и components/management |
| Канат | Проверка всех 29URL, багрепорты и доказательства только в docs/qa-week; исходники не меняет |

Точные каталоги перечислены в актуальных промптах. Layout внутри принадлежащей участнику папки остаётся общим файлом Курала. Владелец заменяет только свой шаблон, общую основу не переписывает. Существующий UI участников не заменяем каркасом. Общие запросы передаём Куралу.

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

1. Начинаем от актуального `main` после архитектурных изменений Курала; используем отдельные копии и фиксируем базовый SHA.
2. Акылбек работает по `docs/prompts/akylbek-week.md`, Койшыман — `koishyman-week.md`, Канат — `qanat-week.md`.
3. Изменяем только свою область; общие файлы, зависимости и реестр согласуем с Куралом.
4. Участник проверяет lint/build, Курал интегрирует, Канат перепроверяет все 29 маршрутов по текущему SHA.
5. Коммиты и описания — на русском. Публикация и PR — по явному разрешению пользователя.
6. К 8 ноября принимаем фактически завершённые и проверенные экраны. Существование шаблона само по себе не считается готовым frontend или MVP.

Октябрьские промпты сохранены как история прежнего этапа. Сроки, матрица URL и критерии приёмки — в `docs/frontend-week.md`.

## Референсы Tailwind

- [Sidebar Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/sidebar): боковая навигация на компьютере, компактная шапка и раскрываемое меню на телефоне.
- [Stats](https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/stats): число результата крупнее пояснения, GPA и показатели кредитов разделены по смыслу.
- [Form Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts): подпись над полем, подсказка под полем, ясные группы данных.
- [Theme variables](https://tailwindcss.com/docs/theme) и [Responsive design](https://tailwindcss.com/docs/responsive-design): общие токены и адаптивность.

Композиция ScholarPath реализована собственными компонентами. Для адаптивного скрытия компонента с собственным display используйте обёртку; не пытайтесь переопределить его конфликтующими классами `hidden` и `inline-flex` на одном элементе.
