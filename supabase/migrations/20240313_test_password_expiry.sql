-- Create a test password that's 27 days old
create or replace function test_password_expiry()
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  -- Get the first user from auth.users
  select id into v_user_id from auth.users limit 1;
  
  -- Insert a test password that's 27 days old
  insert into passwords (
    title,
    username,
    encrypted_password,
    user_id,
    created_at,
    updated_at
  ) values (
    'Test Expiring Password',
    'testuser',
    'encrypted_test_password',
    v_user_id,
    now() - interval '27 days',
    now() - interval '27 days'
  );
end;
$$;
