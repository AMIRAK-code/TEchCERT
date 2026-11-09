-- Admin-issued certificates: aligholami2273@gmail.com receives all four certifications.
-- IDs were generated with makeCredentialId(holder_name, courseId, issuedAt), like the staff certificates.
insert into public.certificates (cred_id, email, holder_name, course_id, issued_at, method) values
  ('TC-HVB3-QDE9', 'aligholami2273@gmail.com', 'Gholami Nodeh Ali', 'ai-prompt-engineer', '2026-11-09T09:00:00Z', 'admin'),
  ('TC-5PAJ-EV8X', 'aligholami2273@gmail.com', 'Gholami Nodeh Ali', 'ai-security',        '2026-11-09T09:00:00Z', 'admin'),
  ('TC-ZFXA-UDYA', 'aligholami2273@gmail.com', 'Gholami Nodeh Ali', 'ai-marketing',       '2026-11-09T09:00:00Z', 'admin'),
  ('TC-ECT2-6DHK', 'aligholami2273@gmail.com', 'Gholami Nodeh Ali', 'ai-seo-geo',         '2026-11-09T09:00:00Z', 'admin')
on conflict (cred_id) do nothing;

-- Attach to the existing account.
update public.certificates c
   set user_id = p.id
  from public.profiles p
 where c.user_id is null and c.email = p.email;
