-- Drop existing policies first
drop policy if exists "Users can view their own categories" on public.categories;
drop policy if exists "Users can insert their own categories" on public.categories;
drop policy if exists "Users can update their own categories" on public.categories;
drop policy if exists "Users can delete their own categories" on public.categories;
drop policy if exists "Users can view their own passwords" on public.passwords;
drop policy if exists "Users can insert their own passwords" on public.passwords;
drop policy if exists "Users can update their own passwords" on public.passwords;
drop policy if exists "Users can delete their own passwords" on public.passwords;

-- Drop existing triggers and functions
drop trigger if exists handle_password_update on public.passwords;
drop function if exists public.handle_password_update();

-- Create tables for the password manager
create table if not exists public.categories (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    icon_url text,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

create table if not exists public.passwords (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    username text not null,
    encrypted_password text not null,
    category_id uuid references public.categories(id) on delete set null,
    user_id uuid references auth.users(id) on delete cascade not null,
    website_url text,
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    last_modified_date timestamptz default now() not null,
    is_demo boolean default false not null
);

-- Create a function to handle password updates
create or replace function public.handle_password_update()
returns trigger as $$
begin
    -- Allow manual updates of last_modified_date when is_demo is true
    if new.is_demo then
        return new;
    end if;
    
    -- For non-demo passwords, auto-update timestamp when password changes
    if new.encrypted_password <> old.encrypted_password then
        new.last_modified_date = now();
        new.updated_at = now();
    end if;
    return new;
end;
$$ language plpgsql;

-- Create a trigger for the password update handler
create trigger handle_password_update
    before update on public.passwords
    for each row
    execute function public.handle_password_update();

-- Add RLS policies
alter table public.categories enable row level security;
alter table public.passwords enable row level security;

-- Categories policies
create policy "Users can view their own categories"
    on public.categories for select
    using (auth.uid() = user_id);

create policy "Users can insert their own categories"
    on public.categories for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own categories"
    on public.categories for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own categories"
    on public.categories for delete
    using (auth.uid() = user_id);

-- Passwords policies
create policy "Users can view their own passwords"
    on public.passwords for select
    using (auth.uid() = user_id);

create policy "Users can insert their own passwords"
    on public.passwords for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own passwords"
    on public.passwords for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own passwords"
    on public.passwords for delete
    using (auth.uid() = user_id);
