-- techCert schema: profiles, progress, exam attempts, certificates.
-- Certificates are only ever created by SECURITY DEFINER functions, never by direct inserts.

-- ---------------------------------------------------------------- tables
create table public.courses (
  id           text primary key,
  title        text not null,
  pass_mark    int  not null check (pass_mark between 1 and 100),
  lesson_count int  not null check (lesson_count > 0),
  exam_size    int  not null check (exam_size > 0)
);

create table public.staff_allowlist (
  email     text primary key check (email = lower(email)),
  full_name text not null,
  role      text not null default 'admin' check (role in ('admin'))
);

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now()
);

create table public.lesson_progress (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id    text not null references public.courses (id),
  lesson_id    text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id, lesson_id)
);

create table public.exam_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  text not null references public.courses (id),
  score      int not null,
  total      int not null,
  passed     boolean not null,
  created_at timestamptz not null default now()
);

create table public.certificates (
  cred_id     text primary key,
  user_id     uuid references auth.users (id) on delete set null,
  email       text not null check (email = lower(email)),
  holder_name text not null,
  course_id   text not null references public.courses (id),
  issued_at   timestamptz not null default now(),
  score       int,
  method      text not null check (method in ('exam', 'admin')),
  revoked     boolean not null default false,
  issued_by   uuid references auth.users (id)
);

create unique index certificates_one_per_holder on public.certificates (email, course_id);
create index exam_attempts_user on public.exam_attempts (user_id, course_id);

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- TC-XXXX-XXXX from an unambiguous alphabet
create or replace function public.gen_cred_id()
returns text
language plpgsql volatile set search_path = public
as $$
declare
  alphabet text  := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes    bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  result   text  := 'TC-';
begin
  for i in 0..7 loop
    if i = 4 then result := result || '-'; end if;
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- New auth user -> profile. Staff emails get their allowlisted name and role,
-- and any certificates pre-issued to the email are attached to the account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  staff staff_allowlist%rowtype;
begin
  select * into staff from staff_allowlist where email = lower(new.email);
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(staff.full_name, new.raw_user_meta_data ->> 'full_name'),
    coalesce(staff.role, 'learner')
  );
  update certificates set user_id = new.id where user_id is null and email = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RPCs
-- Records an exam attempt and issues a certificate when the server-side rules pass.
create or replace function public.submit_exam(p_course_id text, p_score int, p_total int)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  c       courses%rowtype;
  prof    profiles%rowtype;
  cert    certificates%rowtype;
  done    int;
  ok      boolean;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select * into c from courses where id = p_course_id;
  if not found then raise exception 'Unknown course %', p_course_id; end if;
  if p_total <> c.exam_size or p_score < 0 or p_score > p_total then
    raise exception 'Invalid exam result';
  end if;

  select count(*) into done from lesson_progress where user_id = uid and course_id = p_course_id;
  if done < c.lesson_count then raise exception 'Complete all lessons before taking the exam'; end if;

  ok := p_score * 100 >= c.pass_mark * p_total;
  insert into exam_attempts (user_id, course_id, score, total, passed) values (uid, p_course_id, p_score, p_total, ok);

  if ok then
    select * into prof from profiles where id = uid;
    select * into cert from certificates where email = prof.email and course_id = p_course_id;
    if not found then
      insert into certificates (cred_id, user_id, email, holder_name, course_id, score, method)
      values (gen_cred_id(), uid, prof.email, coalesce(prof.full_name, prof.email), p_course_id,
              round(p_score * 100.0 / p_total), 'exam')
      returning * into cert;
    end if;
  end if;

  return jsonb_build_object(
    'passed', ok,
    'certificate', case when cert.cred_id is null then null else to_jsonb(cert) end
  );
end;
$$;

-- Public verification: returns only what is printed on the certificate (no email).
create or replace function public.verify_certificate(p_cred_id text)
returns table (cred_id text, holder_name text, course_id text, issued_at timestamptz, method text, revoked boolean, score int)
language sql stable security definer set search_path = public
as $$
  select c.cred_id, c.holder_name, c.course_id, c.issued_at, c.method, c.revoked, c.score
  from certificates c
  where c.cred_id = upper(trim(p_cred_id));
$$;

create or replace function public.admin_issue_certificate(p_email text, p_name text, p_course_id text)
returns certificates
language plpgsql security definer set search_path = public
as $$
declare
  cert certificates%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  insert into certificates (cred_id, user_id, email, holder_name, course_id, method, issued_by)
  values (gen_cred_id(), (select id from profiles where email = lower(p_email)), lower(p_email), p_name, p_course_id, 'admin', auth.uid())
  returning * into cert;
  return cert;
end;
$$;

-- ---------------------------------------------------------------- privileges
revoke execute on function public.gen_cred_id() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.submit_exam(text, int, int) from public, anon;
revoke execute on function public.admin_issue_certificate(text, text, text) from public, anon;
grant execute on function public.submit_exam(text, int, int) to authenticated;
grant execute on function public.admin_issue_certificate(text, text, text) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.courses         enable row level security;
alter table public.staff_allowlist enable row level security;
alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exam_attempts   enable row level security;
alter table public.certificates    enable row level security;

create policy "courses are public"         on public.courses         for select using (true);
create policy "admins read staff"          on public.staff_allowlist for select using (public.is_admin());
create policy "read own profile"           on public.profiles        for select using (id = auth.uid() or public.is_admin());
create policy "manage own progress"        on public.lesson_progress for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own attempts"          on public.exam_attempts   for select using (user_id = auth.uid() or public.is_admin());
create policy "read own certificates"      on public.certificates    for select using (user_id = auth.uid() or public.is_admin());
create policy "admins update certificates" on public.certificates    for update using (public.is_admin()) with check (public.is_admin());
-- no insert/delete policies on attempts or certificates: only the functions above write them
