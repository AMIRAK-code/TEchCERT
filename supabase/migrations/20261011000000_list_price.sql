-- Intro offer: a course can show a higher list price struck through next to what is
-- actually charged. AI Prompt Engineer lists at €5.99 and sells for €1.99 (the entry
-- course, usually a learner's first purchase). The charged amount is unchanged:
-- price_cents is still what create-checkout charges, before the 20% returning-learner discount.

alter table public.courses add column if not exists list_price_cents int check (list_price_cents > 0);
update public.courses set list_price_cents = 599 where id = 'ai-prompt-engineer';

-- Same as in 20261009000000_stripe_paywall.sql, plus 'list_cents' (display only).
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
    'list_cents', greatest(coalesce(c.list_price_cents, c.price_cents), c.price_cents),
    'base_cents', c.price_cents,
    'price_cents', case when discounted then round(c.price_cents * 0.8)::int else c.price_cents end,
    'discounted', discounted,
    'currency',   'eur',
    'has_access', p_user is not null and has_exam_access(p_user, p_course_id)
  );
end;
$$;

revoke execute on function public.price_for(uuid, text) from public, anon, authenticated;
grant execute on function public.price_for(uuid, text) to service_role;
