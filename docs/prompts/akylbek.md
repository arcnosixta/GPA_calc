# Готовый промпт: Акылбек — три студенческие страницы

Ты работаешь над учебным проектом ScholarPath как агент Kuat Akylbek, ответственного за UI/UX и frontend. Твоя задача — реализовать три завершённые страницы чистого UI: личный кабинет `/dashboard`, начальную настройку `/setup` и «Мои предметы» `/subjects`.

Базовый репозиторий команды — `/home/arcnosixta/GPA_calc`. Работай в своём клоне от одного базового коммита, переданного Куралом для `codex/ui-foundation`; твоя ветка — `codex/student-ui`. Сначала прочитай `README.md`, `AGENTS.md`, `docs/ui-contract.md`, затем исходники `@/components/ui`, `@/components/ui/icon`, `@/lib/types` и `@/lib/demo-data`. Соблюдай локальные инструкции по используемой версии Next.js.

## Что тебе разрешено менять

- `src/app/(workspace)/dashboard/**`.
- `src/app/(workspace)/setup/**`.
- `src/app/(workspace)/subjects/**`.
- `src/components/student/**`.

Замени подготовленные Куралом короткие `page.tsx` в своих маршрутах. Они являются заглушками, а не готовыми страницами. Общую оболочку, глобальные стили, shared-компоненты, данные, типы, конфигурацию, зависимости и документацию не меняй. Файлы `/management` принадлежат Койшыману. Если общего компонента или данных не хватает, сообщи Куралу; не меняй контракт самостоятельно.

## Дизайн

Строго белый с чёрным и нейтральными серыми оттенками; все пользовательские тексты на русском. Используй примеры Tailwind CSS, адаптируя их к общему стилю. Без цветных акцентов, градиентов, внешних шрифтов и новых библиотек.

Системный sans; карточки `rounded-xl`, кнопки и поля `rounded-lg`; контейнер `max-w-6xl`; интервалы `gap-4`/`gap-6`, отступы 4/6/8 по шкале Tailwind. Токены: `bg-background` (#fafafa), `bg-surface` (#fff), `bg-surface-muted` (#f4f4f5), `text-foreground` (#18181b), `text-muted` (#62626b), `border-border` (#e4e4e7), `bg-primary` (#18181b), `text-primary-foreground` (#fff). Остальные utility-классы — стандартные чёрно-бело-серые.

`src/app/(workspace)/layout.tsx` уже выводит `main`, sidebar и навигацию. Внутри страниц их повторять не нужно. `(workspace)` не входит в URL; не создавай дубликаты маршрутов вне группы.

## Содержание страниц

### `/dashboard` — личный кабинет

Покажи заголовок, имя студента, текущую группу и семестр. Добавь карточки общего GPA и GPA семестра, показателей кредитов и прогресса «2 из 3 предметов с оценкой». Покажи короткий список предметов личного плана и понятные ссылки на настройку и полный список.

Используй `demoStudent`, `demoGroups`, `demoStudyPlan` и готовую `demoSummary`. Ясно обозначь, что это демонстрационные данные. Не добавляй графики или функции будущих этапов ради заполнения места.

### `/setup` — выбор группы или предметов

Покажи два пути, описанных в README: выбор группы с готовым планом и самостоятельный выбор предметов из каталога. Предусмотри названия групп и программ, выбор семестра и понятное представление предметов с кредитами.

Допускаются статический макет или локальный выбор с `useState`. Если реализуешь предпросмотр выбранного плана, прямо подпиши, что он демонстрационный и не сохраняется. Переход на `/subjects` должен вести на уже существующий демоплан; не обещай перенос выбора между страницами, если его нет. Достаточно полезного, ясного UI без полного поведения будущего приложения.

### `/subjects` — мои предметы

Покажи `demoStudyPlan`, семестр, код и название предмета, кредиты и оценку. Для `grade: null` используй «Без оценки». Добавь понятную сводку из `demoSummary` и подходящее представление для небольшого экрана.

Не вычисляй GPA. Если допускаешь локальный выбор оценки, обозначь его как предпросмотр, а сводку — как отдельный исходный демопример; не создавай впечатления, что статическая сводка пересчиталась. Можно ограничиться отображением оценок, чтобы сохранить ясность. Пустое состояние допустимо для фильтра с нулевым результатом, если такой фильтр реализован.

## Общие экспорты

Из `@/components/ui` доступны:

- `Button`: нативные button props и `variant?: 'primary' | 'secondary' | 'ghost'`; по умолчанию `type="button"`.
- `buttonStyles(variant?: 'primary' | 'secondary' | 'ghost')` для `className` на `Link` из `next/link`.
- `Card`: нативные div props.
- `Badge`: нативные span props и `variant?: 'default' | 'strong' | 'outline'`.
- `PageHeader({ eyebrow?, title, description?, action? })`.
- `EmptyState({ title, description, action? })`.
- `Input` и `Select`: нативные props соответствующих элементов.
- `Field({ label, htmlFor, hint?, error?, children })`.

`action` и `children` — `ReactNode`. `Field` создаёт подсказку с ID `htmlFor + '-hint'` и ошибку с ID `htmlFor + '-error'`; `aria-describedby` и `aria-invalid` на поле ставишь ты. `id` поля совпадает с `htmlFor`. Не используй несуществующие props вроде `asChild` или `size`.

`Icon` из `@/components/ui/icon`: `name` равен одному из `'grid' | 'book' | 'layers' | 'settings' | 'arrow' | 'chevron' | 'check' | 'plus' | 'menu' | 'close' | 'cap'`; есть необязательный `className`.

Общие типы из `@/lib/types`:

```ts
type Grade = 'A' | 'A−' | 'B+' | 'B' | 'B−' | 'C+' | 'C' | 'C−' | 'D+' | 'D' | 'F';
type Subject = { id: string; code: string; title: string; credits: number; semester: number; groupId: string; grade: Grade | null };
type Group = { id: string; name: string; program: string; year: number; subjectCount: number };
type Student = { name: string; initials: string; groupId: string; semester: number };
```

Из `@/lib/demo-data` доступны `demoStudent`, `demoGroups: Group[]`, `demoSubjects: Subject[]`, `demoStudyPlan: Subject[]`, `demoSemesters: number[]`, `gradeOptions: Grade[]` и `demoSummary` с полями `overallGpa: string`, `semesterGpa: string`, `plannedCredits: number`, `gradedCredits: number`, `earnedCredits: number`, `gradedSubjects: number`, `totalSubjects: number`.

`demoStudyPlan` — три предмета каталога с ID `math`, `programming`, `english`. Единый пример: A на 3 кредита, B на 2 и предмет без оценки на 3; GPA `3.60`, в плане 8 кредитов, с оценкой 5, зачтено 5, оценены 2 из 3. Остальные предметы каталога без оценок. Для личного плана не используй весь каталог `demoSubjects`.

## Ограничения и готовность

Без API, БД, Server Actions, авторизации, сохранения, localStorage и вычислений GPA. Локальный `useState` допускается для UI; клиентскими делай только нужные компоненты. Общие массивы не изменяй. Все предложенные взаимодействия необязательны; активная кнопка должна иметь понятный результат, а обещаний реального сохранения быть не должно.

Проверь страницы на 320, 360, 768, 1024 и 1440 px; таблицы не должны раздвигать всю страницу. Проверь клавиатурный фокус, подписи полей и переходы. Выполни локально `npm run lint` и `npm run build`. Push и PR без отдельного запроса не делай.

В конце передай Куралу краткий отчёт: что готово, какие файлы изменены, какие UI-взаимодействия реализованы, результаты lint/build и известные ограничения. Не отмечай весь продукт или MVP готовым: сегодня заканчиваем только три студенческие UI-страницы.
