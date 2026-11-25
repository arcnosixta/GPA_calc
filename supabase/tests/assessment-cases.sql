-- Loaded inside the local database test transaction and removed by its rollback.
create temporary table qa_assessment_cases (
  name text primary key,
  rk1 numeric,
  rk2 numeric,
  exam numeric,
  final_score integer,
  grade text,
  grade_points numeric
) on commit drop;

with scale (minimum, grade, points) as (values
  (0, 'F', 0.00), (25, 'FX', 0.50), (50, 'D', 1.00), (55, 'D+', 1.33),
  (60, 'C−', 1.67), (65, 'C', 2.00), (70, 'C+', 2.33), (75, 'B−', 2.67),
  (80, 'B', 3.00), (85, 'B+', 3.33), (90, 'A−', 3.67), (95, 'A', 4.00)
), thresholds as (
  select *, lag(grade) over (order by minimum) as lower_grade,
    lag(points) over (order by minimum) as lower_points
  from scale
)
insert into qa_assessment_cases
select minimum || ' below', minimum - 0.501, minimum - 0.501, minimum - 0.501,
  minimum - 1, lower_grade, lower_points
from thresholds where minimum > 0
union all
select minimum || ' tie', minimum - 0.5, minimum - 0.5, minimum - 0.5,
  minimum, grade, points
from thresholds where minimum > 0
union all
select minimum || ' above', minimum - 0.499, minimum - 0.499, minimum - 0.499,
  minimum, grade, points
from thresholds where minimum > 0;

insert into qa_assessment_cases values
  ('decimal tie regression', 4.1, 66.1, 8.6, 25, 'FX', 0.50),
  ('decimal just below', 24.499999999999996, 24.499999999999996, 24.499999999999996, 24, 'F', 0.00),
  ('decimal just above', 24.500000000000004, 24.500000000000004, 24.500000000000004, 25, 'FX', 0.50),
  ('scientific notation score', 0.0000001, 0, 61.24999995, 25, 'FX', 0.50),
  ('first test weight', 100, 0, 0, 30, 'FX', 0.50),
  ('second test weight', 0, 100, 0, 30, 'FX', 0.50),
  ('exam weight', 0, 0, 100, 40, 'FX', 0.50),
  ('zero', 0, 0, 0, 0, 'F', 0.00),
  ('maximum', 100, 100, 100, 100, 'A', 4.00),
  ('only rk1', 0, null, null, null, null, null),
  ('only rk2', null, 66.1, null, null, null, null),
  ('only exam', null, null, 8.6, null, null, null),
  ('no rk1', null, 66.1, 8.6, null, null, null),
  ('no rk2', 0, null, 8.6, null, null, null),
  ('no exam', 0, 66.1, null, null, null, null),
  ('all empty', null, null, null, null, null, null);
