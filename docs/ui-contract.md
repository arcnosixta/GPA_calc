# ScholarPath: общий договор по интерфейсу

## Задача текущего этапа

На frontend-неделе 2–8 ноября команда дорабатывает демо-вход, студенческий путь, GPA и управление. Реестр содержит 32 URL, включая пять перенаправлений. Объём и критерии приёмки описаны в [плане недели](frontend-week.md).

README описывает требования и этапы продукта. Реестр `src/lib/site-routes.ts` связывает URL с владельцами и этапами. Прямые roadmap-макеты служат для демонстрации будущих этапов.

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

- `src/app/layout.tsx` подключает глобальные стили и метаданные и задаёт русский язык.
- `src/app/(workspace)/layout.tsx` подключает общую оболочку с меню и единственным `main` рабочих страниц.
- `src/app/(auth)/layout.tsx` подключает отдельную оболочку аккаунта.
- `src/lib/site-routes.ts` содержит 32 URL, этапы, владельцев и группы навигации.
- `src/lib/demo-session.ts` предоставляет контракт демосессии и профиля в текущей вкладке.
- `src/components/layout/route-scaffold.tsx` и `src/lib/scaffold-content.ts` используются для рабочих макетов. Формы входа и регистрации используют демосессию.

Названия групп `(workspace)` и `(auth)` в URL не входят. Не создавайте одинаковые маршруты внутри и вне групп. Страницы возвращают только содержимое, общие `main`/sidebar/navbar не повторяются.

| Владелец | Область |
| --- | --- |
| Курал | Общие layouts, реестр, демо-вход, сессия, диалог профиля, ролевые ограничения, навигация, `/gamification`, общий UI, стили, данные, конфигурация и интеграция |
| Акылбек | `/dashboard`, `/profile`, `/subjects`, `/setup`, progress и chats. Подключение расчёта GPA. UX форм входа отдельным согласованным срезом |
| Койшыман | Все страницы management и локальные компоненты управления |
| Канат | `src/lib/gpa.ts`, `scripts/gpa.test.mjs`, QA всех 32 URL, отчёты и доказательства в `docs/qa-week/**` |

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
  universityId: string;
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
- `demoUniversities: { id: string; name: string }[]`.
- `demoGroups: Group[]`.
- `demoSubjects: Subject[]` — общий демонстрационный каталог.
- `demoStudyPlan: Subject[]` — предметы из `demoSubjects` с ID `math`, `programming`, `english`; личный план для демонстрации.
- `demoSemesters: number[]`.
- `gradeOptions: Grade[]`.
- `demoSummary: { overallGpa: string; semesterGpa: string; plannedCredits: number; gradedCredits: number; earnedCredits: number; gradedSubjects: number; totalSubjects: number }`.

Исходный пример содержит A на 3 кредита, B на 2 кредита и предмет без оценки на 3 кредита. Общий и семестровый GPA равны `3.60`. В плане 8 кредитов, с оценкой 5, зачтено 5. Оценены 2 из 3 предметов. `demoStudyPlan` содержит личный план, `demoSubjects` содержит полный каталог.

Канат реализует `calculateGpa` и `gradePoints` в `@/lib/gpa`, Акылбек подключает модуль к локальным оценкам. Статические значения `demoSummary` служат исходным примером. Прогноз использует явно указанные предположения и отдельное состояние. Формула и граничные случаи описаны в README и плане недели.

## Граница UI-прототипа

Демосессия и профиль используют `sessionStorage` через общий модуль. `useDemoSession()` различает `undefined` при восстановлении, `null` без сессии и объект активной сессии. Изменения профиля передаются в `saveDemoProfile(profile)`. Выборы, фильтры, валидация, учебные оценки и предпросмотры могут использовать локальное состояние. Добавляйте `'use client'` компонентам с интерактивностью.

Каждая активная кнопка даёт понятный результат. Формы и локальные изменения помечены как демонстрационные. Ролевой переключатель показывает варианты UI. Серверная авторизация, API, БД, Server Actions, постоянное хранение учебных записей, публикация и отправка относятся к дальнейшей реализации.

## Совместная работа

1. Начинаем от актуального `main` после архитектурных изменений Курала. Используем отдельные копии и фиксируем базовый SHA.
2. Акылбек работает по `docs/prompts/akylbek-week.md`, Койшыман — `koishyman-week.md`, Канат — `qanat-week.md`.
3. Изменяем только свою область. Общие файлы, зависимости и реестр согласуем с Куралом.
4. Участник проверяет lint и build. Курал интегрирует изменения в `main`. Канат проверяет 32 URL по текущему SHA.
5. Коммиты и описания пишем по-русски. Публикация рабочих веток и PR требуют явного разрешения пользователя.
6. К 8 ноября команда фиксирует статус реализации и проверки сценариев для каждого экрана.

Октябрьские промпты сохранены как история прежнего этапа. Сроки, матрица URL и критерии приёмки — в `docs/frontend-week.md`.

## Референсы Tailwind

- [Sidebar Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/sidebar): боковая навигация на компьютере, компактная шапка и раскрываемое меню на телефоне.
- [Stats](https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/stats): число результата крупнее пояснения, GPA и показатели кредитов разделены по смыслу.
- [Form Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts): подпись над полем, подсказка под полем, ясные группы данных.
- [Theme variables](https://tailwindcss.com/docs/theme) и [Responsive design](https://tailwindcss.com/docs/responsive-design): общие токены и адаптивность.

Композиция ScholarPath реализована собственными компонентами. Для адаптивного скрытия компонента с собственным display используйте обёртку; не пытайтесь переопределить его конфликтующими классами `hidden` и `inline-flex` на одном элементе.
