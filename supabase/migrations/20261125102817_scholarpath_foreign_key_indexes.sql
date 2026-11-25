-- Cover the complete foreign keys, including archived catalogue rows.
create index subjects_program on public.subjects(program_id);
create index study_plan_items_group on public.study_plan_items(group_id, program_id);
create index study_plan_items_semester on public.study_plan_items(semester);
create index moderator_groups_role on public.moderator_groups(moderator_id, moderator_role);
create index student_subjects_semester on public.student_subjects(semester);
