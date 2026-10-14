-- Admin-issued certificates for the two newer courses (AI Marketing Specialist,
-- AI SEO & GEO Specialist), so both staff accounts hold all four certifications.
-- IDs match src/data/registry.js (makeCredentialId(name, courseId, issuedAt)).
insert into public.certificates (cred_id, email, holder_name, course_id, issued_at, method) values
  ('TC-6LW2-6ZGC', 'amir.akbari@inrebus.it',   'Amirhossein Akbari', 'ai-marketing', '2026-10-08T09:00:00Z', 'admin'),
  ('TC-VH5H-WF5P', 'amir.akbari@inrebus.it',   'Amirhossein Akbari', 'ai-seo-geo',   '2026-10-08T09:00:00Z', 'admin'),
  ('TC-PSS8-G3JY', 'faraz.haghgoo@inrebus.it', 'Faraz Haghgoo',      'ai-marketing', '2026-10-08T09:00:00Z', 'admin'),
  ('TC-YDPY-WCFL', 'faraz.haghgoo@inrebus.it', 'Faraz Haghgoo',      'ai-seo-geo',   '2026-10-08T09:00:00Z', 'admin')
on conflict (cred_id) do nothing;

-- Attach to accounts that already exist; new sign-ups get them via handle_new_user().
update public.certificates c
   set user_id = p.id
  from public.profiles p
 where c.user_id is null and c.email = p.email;
