-- Course rules enforced by submit_exam(). Keep in sync with src/data/*.js
-- (passMark, lesson count, examSize).
insert into public.courses (id, title, pass_mark, lesson_count, exam_size) values
  ('ai-prompt-engineer', 'AI Prompt Engineer',       70, 8, 15),
  ('ai-security',        'AI Security Professional', 70, 8, 15)
on conflict (id) do update
  set title = excluded.title, pass_mark = excluded.pass_mark,
      lesson_count = excluded.lesson_count, exam_size = excluded.exam_size;

-- Internal admins. They become admins on first sign-in (see handle_new_user).
insert into public.staff_allowlist (email, full_name, role) values
  ('amir.akbari@inrebus.it',   'Amirhossein Akbari', 'admin'),
  ('faraz.haghgoo@inrebus.it', 'Faraz Haghgoo',      'admin')
on conflict (email) do update set full_name = excluded.full_name, role = excluded.role;

-- Admin-issued certificates. IDs match src/data/registry.js so they verify identically
-- with or without the database.
insert into public.certificates (cred_id, email, holder_name, course_id, issued_at, method) values
  ('TC-FMDD-AWYL', 'amir.akbari@inrebus.it',   'Amirhossein Akbari', 'ai-prompt-engineer', '2026-09-30T09:00:00Z', 'admin'),
  ('TC-5RZJ-LG5J', 'amir.akbari@inrebus.it',   'Amirhossein Akbari', 'ai-security',        '2026-09-30T09:00:00Z', 'admin'),
  ('TC-NERP-6NUB', 'faraz.haghgoo@inrebus.it', 'Faraz Haghgoo',      'ai-prompt-engineer', '2026-09-30T09:00:00Z', 'admin'),
  ('TC-SC7C-EZBE', 'faraz.haghgoo@inrebus.it', 'Faraz Haghgoo',      'ai-security',        '2026-09-30T09:00:00Z', 'admin')
on conflict (cred_id) do nothing;

-- If the staff accounts already exist, promote them and attach their certificates now.
update public.profiles p
   set role = s.role, full_name = s.full_name
  from public.staff_allowlist s
 where p.email = s.email;

update public.certificates c
   set user_id = p.id
  from public.profiles p
 where c.user_id is null and c.email = p.email;
