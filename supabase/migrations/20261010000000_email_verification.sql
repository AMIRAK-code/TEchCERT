-- Email + password accounts with no confirmation email at sign-up. Email ownership is
-- proven later (after a purchase) by opening a link we email. Supabase marks every
-- password sign-up as confirmed when "Confirm email" is off, so we track proof ourselves.

alter table public.profiles add column if not exists email_verified_at timestamptz;

-- Accounts without a password can only ever have signed in through an emailed link,
-- so their email is already proven (all accounts created before this change).
update public.profiles p set email_verified_at = p.created_at
from auth.users u
where u.id = p.id and p.email_verified_at is null and coalesce(u.encrypted_password, '') = '';

-- Called by the app after every sign-in. Marks the email verified only when the current
-- session was created from an emailed link or code (JWT "amr" claim), which only the
-- owner of the mailbox can obtain. Returns whether the email is verified.
create or replace function public.mark_email_verified()
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  via_email boolean;
  verified timestamptz;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  via_email := exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) m
    where m ->> 'method' in ('otp', 'magiclink', 'recovery', 'email/signup', 'email_change', 'invite')
  );
  if via_email then
    update profiles set email_verified_at = coalesce(email_verified_at, now()) where id = uid
    returning email_verified_at into verified;
  else
    select email_verified_at into verified from profiles where id = uid;
  end if;
  return verified is not null;
end;
$$;

revoke execute on function public.mark_email_verified() from public, anon;
grant execute on function public.mark_email_verified() to authenticated;
