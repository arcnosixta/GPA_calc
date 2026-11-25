# Проверка RLS через Supabase Auth и Data API

Используйте выделенный локальный экземпляр Supabase со всеми миграциями ScholarPath. Нужны четыре подтверждённых аккаунта с паролями, созданных для этого прогона. Владелец локального экземпляра назначает `moderator` и `admin`. У модератора должно быть назначение на `is-24-1`, у группы `vt-24-1` для него назначения быть не должно. Первые два аккаунта сохраняют роль `student`.

Создайте игнорируемый файл `.env.rls.local` с локальным URL, публичным ключом и данными этих аккаунтов.

```dotenv
SCHOLARPATH_RLS_LIVE=1
SCHOLARPATH_RLS_URL=http://127.0.0.1:54321
SCHOLARPATH_RLS_PUBLISHABLE_KEY=
SCHOLARPATH_RLS_A_EMAIL=qa-rls-a@example.com
SCHOLARPATH_RLS_A_PASSWORD=
SCHOLARPATH_RLS_B_EMAIL=qa-rls-b@example.com
SCHOLARPATH_RLS_B_PASSWORD=
SCHOLARPATH_RLS_MODERATOR_EMAIL=qa-rls-moderator@example.com
SCHOLARPATH_RLS_MODERATOR_PASSWORD=
SCHOLARPATH_RLS_ADMIN_EMAIL=qa-rls-admin@example.com
SCHOLARPATH_RLS_ADMIN_PASSWORD=
```

```shell
node --env-file=.env.rls.local --test tests/database/rls-live.test.mjs
```

Скрипт входит четырьмя независимыми Auth-сессиями и выполняет запросы с пользовательскими токенами. Для анонимных запросов используется тот же публичный ключ без пользовательской сессии. При запуске без `SCHOLARPATH_RLS_LIVE=1` набор помечается пропущенным.

У A и B перед запуском должны отсутствовать личные записи за `2199-2200`. Тест возвращает B роль студента и удаляет временные строки учебных планов по их составным ключам. Обычный API не выдаёт право на удаление личного предмета. После прогона владелец локального экземпляра может удалить только личные строки, выделенные этому тесту. Записи баллов и прогнозов очистятся каскадно. Подставьте email двух локальных тестовых аккаунтов, если в файле использованы другие адреса.

```sql
delete from public.student_subjects as personal
using auth.users as fixture_user
where personal.student_id = fixture_user.id
  and fixture_user.email in ('qa-rls-a@example.com', 'qa-rls-b@example.com')
  and personal.academic_year = '2199-2200'
  and (personal.subject_id, personal.semester) in (('math', 3), ('math', 4), ('programming', 3));
```
