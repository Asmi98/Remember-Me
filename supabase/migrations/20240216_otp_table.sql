-- Create OTP table
create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  code text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  attempts integer default 0
);

-- Add RLS policies
alter table otp_codes enable row level security;

-- Allow users to see their own OTP codes
create policy "Users can view their own OTP codes"
  on otp_codes for select
  using (auth.uid() = user_id);

-- Allow the service role to create OTP codes
create policy "Service role can create OTP codes"
  on otp_codes for insert
  with check (true);

-- Create function to clean up expired OTP codes
create or replace function cleanup_expired_otp_codes()
returns trigger as $$
begin
  delete from otp_codes
  where expires_at < now()
  or used_at is not null
  or attempts >= 3;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to cleanup expired codes
create trigger cleanup_expired_otp_codes
  after insert on otp_codes
  execute procedure cleanup_expired_otp_codes();
