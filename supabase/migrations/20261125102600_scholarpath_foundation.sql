-- ScholarPath foundation. Apply as the database owner in one transaction.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.app_role as enum ('student', 'moderator', 'admin');
create type public.letter_grade as enum ('A', 'A−', 'B+', 'B', 'B−', 'C+', 'C', 'C−', 'D+', 'D', 'FX', 'F');

create function private.valid_academic_year(value text) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
begin
  if value is null or value !~ '^[0-9]{4}-[0-9]{4}$' then return false; end if;
  return substring(value from 6 for 4)::integer = substring(value from 1 for 4)::integer + 1;
end;
$$;

create function private.valid_calendar_range(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare first_date date; last_date date; first_week numeric; last_week numeric;
begin
  if value is null or value = 'null'::jsonb then return true; end if;
  if jsonb_typeof(value) <> 'object' then return false; end if;
  if value ->> 'kind' = 'dates' then
    if jsonb_typeof(value -> 'start') <> 'string' or jsonb_typeof(value -> 'end') <> 'string'
      or not (value ->> 'start' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
      or not (value ->> 'end' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then return false; end if;
    first_date := (value ->> 'start')::date; last_date := (value ->> 'end')::date;
    return to_char(first_date, 'YYYY-MM-DD') = value ->> 'start'
      and to_char(last_date, 'YYYY-MM-DD') = value ->> 'end' and first_date <= last_date;
  end if;
  if value ->> 'kind' <> 'weeks' or jsonb_typeof(value -> 'start') <> 'number'
    or jsonb_typeof(value -> 'end') <> 'number' then return false; end if;
  first_week := (value ->> 'start')::numeric; last_week := (value ->> 'end')::numeric;
  return first_week = trunc(first_week) and last_week = trunc(last_week)
    and first_week >= 1 and last_week <= 53 and first_week <= last_week;
exception when others then return false;
end;
$$;

create function private.valid_calendar_term(period jsonb, rk1 jsonb, rk2 jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare control jsonb;
begin
  if not coalesce(private.valid_calendar_range(period) and private.valid_calendar_range(rk1)
    and private.valid_calendar_range(rk2), false) then return false; end if;
  foreach control in array array[rk1, rk2] loop
    if control ->> 'kind' = period ->> 'kind'
      and (control -> 'start' < period -> 'start' or control -> 'end' > period -> 'end') then return false; end if;
  end loop;
  return not coalesce(rk1 ->> 'kind' = rk2 ->> 'kind' and rk1 -> 'end' >= rk2 -> 'start', false);
end;
$$;

create table public.universities (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(btrim(name)) between 1 and 120),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  unique (name)
);
create table public.programs (
  id text primary key default gen_random_uuid()::text,
  university_id text not null references public.universities(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  unique (university_id, name)
);
create table public.study_groups (
  id text primary key default gen_random_uuid()::text,
  program_id text not null references public.programs(id),
  name text not null check (length(btrim(name)) between 1 and 60),
  year smallint not null check (year between 1 and 6),
  unique (id, program_id),
  unique (program_id, name)
);
create table public.subjects (
  id text primary key default gen_random_uuid()::text,
  program_id text not null references public.programs(id),
  code text not null default '' check (length(code) <= 20),
  title text not null check (length(btrim(title)) between 1 and 120),
  credits smallint not null check (credits between 1 and 30),
  archived_at timestamptz,
  unique (id, program_id)
);
create unique index subjects_active_code on public.subjects(program_id, lower(code))
  where archived_at is null and code <> '';
create table public.semesters (
  number smallint primary key check (number between 1 and 8),
  title text not null check (length(btrim(title)) between 1 and 60),
  is_active boolean not null default true
);
create table public.study_plan_items (
  group_id text not null,
  subject_id text not null,
  semester smallint not null references public.semesters(number),
  program_id text not null,
  primary key (group_id, subject_id, semester),
  foreign key (group_id, program_id) references public.study_groups(id, program_id),
  foreign key (subject_id, program_id) references public.subjects(id, program_id)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (length(first_name) <= 60),
  last_name text not null default '' check (length(last_name) <= 60),
  group_id text references public.study_groups(id)
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  unique (user_id, role)
);
create table public.moderator_groups (
  moderator_id uuid not null,
  group_id text not null references public.study_groups(id),
  moderator_role public.app_role generated always as ('moderator'::public.app_role) stored,
  primary key (moderator_id, group_id),
  foreign key (moderator_id, moderator_role) references public.user_roles(user_id, role) on delete cascade
);
create table public.academic_sources (
  id text primary key default gen_random_uuid()::text,
  university_id text not null references public.universities(id),
  academic_year text not null check (private.valid_academic_year(academic_year)),
  title text not null check (length(btrim(title)) between 1 and 240),
  url text not null check (url ~ '^https://[^[:space:]]+$'),
  checked_at date not null,
  scope text not null check (length(btrim(scope)) between 1 and 240),
  note text not null default '',
  unique (id, university_id, academic_year)
);
create table public.academic_calendars (
  id text primary key default gen_random_uuid()::text,
  university_id text not null references public.universities(id),
  academic_year text not null check (private.valid_academic_year(academic_year)),
  scope text not null check (length(btrim(scope)) between 1 and 240),
  status text not null default 'local' check (status in ('official', 'demo', 'local')),
  source_id text,
  check (status <> 'official' or source_id is not null),
  foreign key (source_id, university_id, academic_year) references public.academic_sources(id, university_id, academic_year)
);
create table public.calendar_terms (
  id text primary key default gen_random_uuid()::text,
  calendar_id text not null references public.academic_calendars(id),
  season text not null check (season in ('autumn', 'spring')),
  period jsonb,
  rk1 jsonb,
  rk2 jsonb,
  unique (calendar_id, season),
  check (private.valid_calendar_term(period, rk1, rk2))
);
create table public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id),
  academic_year text not null check (private.valid_academic_year(academic_year)),
  semester smallint not null references public.semesters(number),
  code text not null,
  title text not null,
  credits smallint not null check (credits between 1 and 30),
  unique (student_id, subject_id, academic_year, semester)
);
create table public.assessments (
  student_subject_id uuid primary key references public.student_subjects(id) on delete cascade,
  rk1 numeric check (rk1 between 0 and 100),
  rk2 numeric check (rk2 between 0 and 100),
  exam numeric check (exam between 0 and 100),
  final_score numeric generated always as (
    case when rk1 is not null and rk2 is not null and exam is not null
      then round((rk1 * 30 + rk2 * 30 + exam * 40) / 100) end
  ) stored
);
create table public.grade_forecasts (
  student_subject_id uuid primary key references public.student_subjects(id) on delete cascade,
  grade public.letter_grade not null
);

create index universities_creator on public.universities(created_by);
create index study_groups_program on public.study_groups(program_id);
create index study_plan_items_subject on public.study_plan_items(subject_id, program_id);
create index profiles_group on public.profiles(group_id);
create index moderator_groups_group on public.moderator_groups(group_id);
create index sources_university_year on public.academic_sources(university_id, academic_year);
create index calendars_source on public.academic_calendars(source_id, university_id, academic_year);
create index calendars_university_year on public.academic_calendars(university_id, academic_year);
create index student_subjects_subject on public.student_subjects(subject_id);

-- Helpers look up roles from protected rows, never from editable JWT metadata.
create function private.current_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.user_roles where auth.uid() is not null and user_id = auth.uid();
$$;
create function private.can_manage_group(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.current_role() = 'admin' or
    (private.current_role() = 'moderator' and exists (
      select 1 from public.moderator_groups where moderator_id = auth.uid() and group_id = target)));
$$;
create function private.can_manage_university(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.current_role() = 'admin' or
    (private.current_role() = 'moderator' and (exists (
      select 1 from public.universities where id = target and created_by = auth.uid()) or exists (
      select 1 from public.moderator_groups m join public.study_groups g on g.id = m.group_id
      join public.programs p on p.id = g.program_id where m.moderator_id = auth.uid() and p.university_id = target))));
$$;
create function private.can_use_program(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.current_role() = 'admin' or
    (private.current_role() = 'moderator' and exists (
      select 1 from public.programs p join public.universities u on u.id = p.university_id where p.id = target
      and private.can_manage_university(u.id) and (u.created_by = auth.uid()
        or not exists (select 1 from public.study_groups where program_id = p.id)
        or exists (select 1 from public.study_groups g
        join public.moderator_groups m on m.group_id = g.id where g.program_id = p.id and m.moderator_id = auth.uid())))));
$$;
create function private.can_manage_program(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.current_role() = 'admin' or
    (private.current_role() = 'moderator' and private.can_use_program(target) and not exists (
      select 1 from public.study_groups g where g.program_id = target and not private.can_manage_group(g.id))));
$$;
create function private.can_manage_subject(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (private.current_role() = 'admin' or
    (private.current_role() = 'moderator' and exists (
      select 1 from public.subjects s where s.id = target and private.can_use_program(s.program_id)) and not exists (
      select 1 from public.study_plan_items i where i.subject_id = target and not private.can_manage_group(i.group_id))));
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Auth creates users before a JWT exists. Only this auth.users trigger can call it.
  if tg_table_schema <> 'auth' or tg_table_name <> 'users' or tg_op <> 'INSERT' then
    raise exception 'Invalid signup trigger context' using errcode = '42501';
  end if;
  insert into public.profiles(id) values (new.id);
  insert into public.user_roles(user_id, role) values (new.id, 'student');
  return new;
end;
$$;
create trigger scholarpath_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create function private.prepare_plan_item() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  select program_id into new.program_id from public.study_groups where id = new.group_id;
  if not exists (select 1 from public.semesters where number = new.semester and is_active) then
    raise exception 'Semester is closed for new plan items' using errcode = '23514';
  end if;
  if not exists (select 1 from public.subjects where id = new.subject_id and archived_at is null) then
    raise exception 'Only active subjects can be added to a plan' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger prepare_plan_item before insert on public.study_plan_items
for each row execute function private.prepare_plan_item();

create function private.prepare_student_subject() returns trigger
language plpgsql security definer set search_path = '' as $$
declare source public.subjects%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not exists (select 1 from public.semesters where number = new.semester and is_active) then
    raise exception 'Semester is closed for new student records' using errcode = '23514';
  end if;
  select * into source from public.subjects where id = new.subject_id and archived_at is null for share;
  if not found then raise exception 'Only active subjects can be selected' using errcode = '23514'; end if;
  new.student_id := auth.uid();
  new.code := source.code; new.title := source.title; new.credits := source.credits;
  return new;
end;
$$;
create trigger prepare_student_subject before insert on public.student_subjects
for each row execute function private.prepare_student_subject();

create function private.check_term_year() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare school_year text; item jsonb;
begin
  select academic_year into school_year from public.academic_calendars where id = new.calendar_id;
  foreach item in array array[new.period, new.rk1, new.rk2] loop
    if item ->> 'kind' = 'dates' and (item ->> 'start' < left(school_year, 4) || '-01-01'
      or item ->> 'end' > right(school_year, 4) || '-12-31') then
      raise exception 'Dates must belong to the academic year' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
create trigger check_term_year before insert or update on public.calendar_terms
for each row execute function private.check_term_year();

create function private.set_user_role(target_user_id uuid, new_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare previous public.app_role;
begin
  if auth.uid() is null or private.current_role() is distinct from 'admin'::public.app_role then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if target_user_id = auth.uid() or new_role is null or new_role not in ('student', 'moderator') then
    raise exception 'Only other student and moderator roles may be assigned' using errcode = '42501';
  end if;
  select role into previous from public.user_roles where user_id = target_user_id for update;
  if not found or previous = 'admin' then
    raise exception 'Target user is unavailable for role changes' using errcode = '42501';
  end if;
  if new_role = 'student' then delete from public.moderator_groups where moderator_id = target_user_id; end if;
  update public.user_roles set role = new_role where user_id = target_user_id;
end;
$$;
create function public.admin_set_user_role(target_user_id uuid, new_role public.app_role) returns void
language sql security invoker set search_path = '' as $$
  select private.set_user_role(target_user_id, new_role);
$$;
create function public.grade_from_score(score integer) returns public.letter_grade
language sql immutable strict security invoker set search_path = '' as $$
  select case when score not between 0 and 100 then null
    when score >= 95 then 'A' when score >= 90 then 'A−' when score >= 85 then 'B+'
    when score >= 80 then 'B' when score >= 75 then 'B−' when score >= 70 then 'C+'
    when score >= 65 then 'C' when score >= 60 then 'C−' when score >= 55 then 'D+'
    when score >= 50 then 'D' when score >= 25 then 'FX' else 'F' end::public.letter_grade;
$$;
create function public.backend_health() returns text
language sql immutable security invoker set search_path = '' as $$ select 'scholarpath-v1'::text; $$;

create view public.student_results with (security_invoker = true) as
select s.*, a.rk1, a.rk2, a.exam, a.final_score, g.grade,
  case g.grade when 'A' then 4.00 when 'A−' then 3.67 when 'B+' then 3.33 when 'B' then 3.00
    when 'B−' then 2.67 when 'C+' then 2.33 when 'C' then 2.00 when 'C−' then 1.67
    when 'D+' then 1.33 when 'D' then 1.00 when 'FX' then 0.50 when 'F' then 0.00 end as grade_points
from public.student_subjects s left join public.assessments a on a.student_subject_id = s.id
cross join lateral (select public.grade_from_score(a.final_score::integer) as grade) g;

-- Fresh Supabase projects may grant all privileges by default. Replace them explicitly.
revoke all on public.universities, public.programs, public.study_groups, public.subjects,
  public.semesters, public.study_plan_items, public.profiles, public.user_roles, public.moderator_groups,
  public.academic_sources, public.academic_calendars, public.calendar_terms,
  public.student_subjects, public.assessments, public.grade_forecasts, public.student_results
  from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.admin_set_user_role(uuid, public.app_role), public.grade_from_score(integer),
  public.backend_health() from public, anon, authenticated;
grant execute on function private.valid_academic_year(text), private.valid_calendar_range(jsonb),
  private.valid_calendar_term(jsonb, jsonb, jsonb), private.current_role(), private.can_manage_group(text),
  private.can_manage_university(text), private.can_use_program(text), private.can_manage_program(text),
  private.can_manage_subject(text), private.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.app_role), public.grade_from_score(integer) to authenticated;
grant execute on function public.backend_health() to anon, authenticated;

grant select on public.universities, public.programs, public.study_groups, public.subjects,
  public.semesters, public.study_plan_items, public.profiles, public.user_roles, public.moderator_groups,
  public.academic_sources, public.academic_calendars, public.calendar_terms,
  public.student_subjects, public.assessments, public.grade_forecasts, public.student_results to authenticated;
grant insert (name) on public.universities to authenticated;
grant update (name) on public.universities to authenticated;
grant insert (university_id, name) on public.programs to authenticated;
grant update (name) on public.programs to authenticated;
grant insert (program_id, name, year) on public.study_groups to authenticated;
grant update (name, year) on public.study_groups to authenticated;
grant insert (program_id, code, title, credits) on public.subjects to authenticated;
grant update (code, title, credits, archived_at) on public.subjects to authenticated;
grant insert (number, title, is_active) on public.semesters to authenticated;
grant update (title, is_active) on public.semesters to authenticated;
grant insert (group_id, subject_id, semester) on public.study_plan_items to authenticated;
grant delete on public.study_plan_items to authenticated;
grant update (first_name, last_name, group_id) on public.profiles to authenticated;
grant insert (moderator_id, group_id) on public.moderator_groups to authenticated;
grant delete on public.moderator_groups to authenticated;
grant insert (university_id, academic_year, title, url, checked_at, scope, note) on public.academic_sources to authenticated;
grant update (title, url, checked_at, scope, note) on public.academic_sources to authenticated;
grant insert (university_id, academic_year, scope, status, source_id) on public.academic_calendars to authenticated;
grant update (scope, status, source_id) on public.academic_calendars to authenticated;
grant insert (calendar_id, season, period, rk1, rk2) on public.calendar_terms to authenticated;
grant update (period, rk1, rk2) on public.calendar_terms to authenticated;
grant insert (subject_id, academic_year, semester) on public.student_subjects to authenticated;
grant insert (student_subject_id, rk1, rk2, exam) on public.assessments to authenticated;
grant update (rk1, rk2, exam) on public.assessments to authenticated;
grant insert (student_subject_id, grade) on public.grade_forecasts to authenticated;
grant update (grade) on public.grade_forecasts to authenticated;
grant delete on public.grade_forecasts to authenticated;

alter table public.universities enable row level security;
alter table public.programs enable row level security;
alter table public.study_groups enable row level security;
alter table public.subjects enable row level security;
alter table public.semesters enable row level security;
alter table public.study_plan_items enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.moderator_groups enable row level security;
alter table public.academic_sources enable row level security;
alter table public.academic_calendars enable row level security;
alter table public.calendar_terms enable row level security;
alter table public.student_subjects enable row level security;
alter table public.assessments enable row level security;
alter table public.grade_forecasts enable row level security;

create policy catalog_read on public.universities for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.programs for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.study_groups for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.subjects for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.semesters for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.study_plan_items for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.academic_sources for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.academic_calendars for select to authenticated using ((select auth.uid()) is not null);
create policy catalog_read on public.calendar_terms for select to authenticated using ((select auth.uid()) is not null);
create policy university_insert on public.universities for insert to authenticated
  with check ((select private.current_role()) in ('moderator', 'admin') and created_by = (select auth.uid()));
create policy university_update on public.universities for update to authenticated
  using (private.can_manage_university(id)) with check (private.can_manage_university(id));
create policy program_insert on public.programs for insert to authenticated
  with check (private.can_manage_university(university_id));
create policy program_update on public.programs for update to authenticated
  using (private.can_manage_program(id)) with check (private.can_manage_program(id));
create policy group_insert on public.study_groups for insert to authenticated
  with check ((select private.current_role()) = 'admin');
create policy group_update on public.study_groups for update to authenticated
  using ((select private.current_role()) = 'admin') with check ((select private.current_role()) = 'admin');
create policy subject_insert on public.subjects for insert to authenticated
  with check (private.can_use_program(program_id));
create policy subject_update on public.subjects for update to authenticated
  using (private.can_manage_subject(id)) with check (private.can_manage_subject(id));
create policy semester_insert on public.semesters for insert to authenticated
  with check ((select private.current_role()) = 'admin');
create policy semester_update on public.semesters for update to authenticated
  using ((select private.current_role()) = 'admin') with check ((select private.current_role()) = 'admin');
create policy plan_insert on public.study_plan_items for insert to authenticated
  with check (private.can_manage_group(group_id));
create policy plan_delete on public.study_plan_items for delete to authenticated
  using (private.can_manage_group(group_id));
create policy profile_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.current_role()) = 'admin');
create policy profile_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.current_role()) = 'admin');
create policy assignments_read on public.moderator_groups for select to authenticated
  using (moderator_id = (select auth.uid()) or (select private.current_role()) = 'admin');
create policy assignments_insert on public.moderator_groups for insert to authenticated
  with check ((select private.current_role()) = 'admin');
create policy assignments_delete on public.moderator_groups for delete to authenticated
  using ((select private.current_role()) = 'admin');
create policy source_insert on public.academic_sources for insert to authenticated
  with check ((select private.current_role()) = 'admin');
create policy source_update on public.academic_sources for update to authenticated
  using ((select private.current_role()) = 'admin') with check ((select private.current_role()) = 'admin');
create policy calendar_insert on public.academic_calendars for insert to authenticated
  with check (private.can_manage_university(university_id) and (status <> 'official' or (select private.current_role()) = 'admin'));
create policy calendar_update on public.academic_calendars for update to authenticated
  using (private.can_manage_university(university_id))
  with check (private.can_manage_university(university_id) and (status <> 'official' or (select private.current_role()) = 'admin'));
create policy term_insert on public.calendar_terms for insert to authenticated with check (exists (
  select 1 from public.academic_calendars c where c.id = calendar_id and private.can_manage_university(c.university_id)
    and (c.status <> 'official' or (select private.current_role()) = 'admin')));
create policy term_update on public.calendar_terms for update to authenticated using (exists (
  select 1 from public.academic_calendars c where c.id = calendar_id and private.can_manage_university(c.university_id)
    and (c.status <> 'official' or (select private.current_role()) = 'admin')))
  with check (exists (select 1 from public.academic_calendars c where c.id = calendar_id
    and private.can_manage_university(c.university_id) and (c.status <> 'official' or (select private.current_role()) = 'admin')));
create policy student_subject_read on public.student_subjects for select to authenticated
  using (student_id = (select auth.uid()));
create policy student_subject_insert on public.student_subjects for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy assessment_read on public.assessments for select to authenticated using (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));
create policy assessment_insert on public.assessments for insert to authenticated with check (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));
create policy assessment_update on public.assessments for update to authenticated using (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())))
  with check (exists (select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));
create policy forecast_read on public.grade_forecasts for select to authenticated using (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));
create policy forecast_insert on public.grade_forecasts for insert to authenticated with check (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));
create policy forecast_update on public.grade_forecasts for update to authenticated using (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())))
  with check (exists (select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));
create policy forecast_delete on public.grade_forecasts for delete to authenticated using (exists (
  select 1 from public.student_subjects s where s.id = student_subject_id and s.student_id = (select auth.uid())));

commit;
