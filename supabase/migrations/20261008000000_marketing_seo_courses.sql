-- New courses: AI Marketing Specialist, AI SEO & GEO Specialist.
-- Keep in sync with src/data/aiMarketing.js and src/data/aiSeoGeo.js.
insert into public.courses (id, title, pass_mark, lesson_count, exam_size) values
  ('ai-marketing', 'AI Marketing Specialist', 70, 8, 15),
  ('ai-seo-geo',   'AI SEO & GEO Specialist', 70, 8, 15)
on conflict (id) do update
  set title = excluded.title, pass_mark = excluded.pass_mark,
      lesson_count = excluded.lesson_count, exam_size = excluded.exam_size;
