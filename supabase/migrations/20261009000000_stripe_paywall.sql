-- Stripe paywall: lessons are free; the exam and certificate are paid per course.
-- Prices are VAT-inclusive (Stripe Tax). After a first paid purchase, every later
-- purchase is 20% off. Purchases are written only by the stripe-webhook Edge Function
-- (service role); learners can read their own rows.

alter table public.courses add column if not exists price_cents int not null default 499 check (price_cents > 0);
update public.courses set price_cents = 199 where id = 'ai-prompt-engineer';
update public.courses set price_cents = 499 where id <> 'ai-prompt-engineer';


create table if not exists public.purchases (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  course_id             text not null references public.courses (id),
  stripe_session_id     text not null unique,
  stripe_payment_intent text,
  amount_cents          int  not null check (amount_cents >= 0),
  currency              text not null,
  discounted            boolean not null default false,
  status                text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at            timestamptz not null default now()
);
create index if not exists purchases_user on public.purchases (user_id, course_id);
create index if not exists purchases_payment_intent on public.purchases (stripe_payment_intent);

alter table public.purchases enable row level security;
drop policy if exists "read own purchases" on public.purchases;
create policy "read own purchases" on public.purchases for select using (user_id = auth.uid() or public.is_admin());
-- no insert/update/delete policies: only the service role (webhook) writes purchases

-- ---------------------------------------------------------------- access & pricing
-- Exam access: admins, holders of a valid certificate for the course (including
-- admin-issued ones), or a paid purchase.
create or replace function public.has_exam_access(p_user uuid, p_course_id text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = p_user and role = 'admin')
      or exists (select 1 from certificates c join profiles p on p.email = c.email
                 where p.id = p_user and c.course_id = p_course_id and not c.revoked)
      or exists (select 1 from purchases where user_id = p_user and course_id = p_course_id and status = 'paid');
$$;

-- Price for a given user. The single source of truth: create-checkout charges this amount.
create or replace function public.price_for(p_user uuid, p_course_id text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  c          courses%rowtype;
  discounted boolean;
begin
  select * into c from courses where id = p_course_id;
  if not found then raise exception 'Unknown course %', p_course_id; end if;
  discounted := p_user is not null and exists (select 1 from purchases where user_id = p_user and status = 'paid');
  return jsonb_build_object(
    'course_id',  c.id,
    'title',      c.title,
    'base_cents', c.price_cents,
    'price_cents', case when discounted then round(c.price_cents * 0.8)::int else c.price_cents end,
    'discounted', discounted,
    'currency',   'eur',
    'has_access', p_user is not null and has_exam_access(p_user, p_course_id)
  );
end;
$$;

-- Caller-facing wrapper (signed in or anonymous).
create or replace function public.course_price(p_course_id text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select price_for(auth.uid(), p_course_id);
$$;

-- ---------------------------------------------------------------- submit_exam: require access
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

  if not has_exam_access(uid, p_course_id) then raise exception 'Purchase the exam for this course first'; end if;

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

-- ---------------------------------------------------------------- privileges
revoke execute on function public.has_exam_access(uuid, text) from public, anon, authenticated;
revoke execute on function public.price_for(uuid, text) from public, anon, authenticated;
revoke execute on function public.course_price(text) from public;
grant execute on function public.course_price(text) to anon, authenticated;
-- the service role (Edge Functions) keeps execute on price_for via its default privileges
grant execute on function public.price_for(uuid, text) to service_role;
