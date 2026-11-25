-- Initial catalogue only. Auth accounts and private student records are created by their owners.
insert into public.semesters(number, title)
select number, number || ' семестр' from generate_series(1, 8) as number
on conflict (number) do nothing;

insert into public.universities(id, name) values
  ('central', 'Центральный технический университет'),
  ('digital', 'Университет цифровых технологий')
on conflict (id) do nothing;

insert into public.programs(id, university_id, name) values
  ('program-is-24-1', 'central', 'Информационные системы'),
  ('program-vt-24-1', 'central', 'Вычислительная техника'),
  ('program-se-25-1', 'digital', 'Программная инженерия')
on conflict (id) do nothing;

insert into public.study_groups(id, program_id, name, year) values
  ('is-24-1', 'program-is-24-1', 'ИС-24-1', 2),
  ('vt-24-1', 'program-vt-24-1', 'ВТ-24-1', 2),
  ('se-25-1', 'program-se-25-1', 'SE-25-1', 1)
on conflict (id) do nothing;

insert into public.subjects(id, program_id, code, title, credits) values
  ('math', 'program-is-24-1', 'MAT 201', 'Математика', 3),
  ('programming', 'program-is-24-1', 'CS 201', 'Программирование', 2),
  ('english', 'program-is-24-1', 'ENG 201', 'Английский язык', 3),
  ('networks', 'program-vt-24-1', 'NET 201', 'Компьютерные сети', 4),
  ('systems', 'program-vt-24-1', 'SYS 201', 'Операционные системы', 3),
  ('design', 'program-se-25-1', 'SE 101', 'Введение в разработку', 5)
on conflict (id) do nothing;

insert into public.study_plan_items(group_id, subject_id, semester) values
  ('is-24-1', 'math', 3), ('is-24-1', 'programming', 3), ('is-24-1', 'english', 3),
  ('vt-24-1', 'networks', 3), ('vt-24-1', 'systems', 3), ('se-25-1', 'design', 1)
on conflict (group_id, subject_id, semester) do nothing;

insert into public.academic_calendars(id, university_id, academic_year, scope, status) values
  ('central-2026-2027-example', 'central', '2026-2027', 'Демонстрационный пример для учебного проекта', 'demo')
on conflict (id) do nothing;

insert into public.calendar_terms(id, calendar_id, season, rk1, rk2) values
  ('central-2026-2027-example-autumn', 'central-2026-2027-example', 'autumn',
    '{"kind":"weeks","start":7,"end":7}', '{"kind":"weeks","start":14,"end":14}'),
  ('central-2026-2027-example-spring', 'central-2026-2027-example', 'spring',
    '{"kind":"weeks","start":7,"end":7}', '{"kind":"weeks","start":14,"end":14}')
on conflict (id) do nothing;
