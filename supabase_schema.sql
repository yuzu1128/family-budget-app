-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- HOUSEHOLDS
create table public.households (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.households enable row level security;

-- Households policies update
create policy "Owners can update their households" on households for update
using ( exists ( select 1 from household_members where household_id = households.id and user_id = auth.uid() and role = 'owner') );

-- HOUSEHOLD_MEMBERS
create table public.household_members (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'member')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(household_id, user_id)
);
alter table public.household_members enable row level security;

-- Policies for Households & Members
-- Helper function to check if user is member of household
create or replace function public.is_member_of(_household_id uuid)
returns bool as $$
begin
  return exists (
    select 1 from public.household_members
    where household_id = _household_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Households policies
create policy "Members can view their households" on households for select
using ( exists ( select 1 from household_members where household_id = households.id and user_id = auth.uid() ) );

create policy "Authenticated users can create households" on households for insert
with check ( auth.role() = 'authenticated' );

-- Household Members policies
create policy "Members can view members of their households" on household_members for select
using ( is_member_of(household_id) );

create policy "Owners can add members" on household_members for insert
with check ( 
    -- Self-join on creation is allowed
    (user_id = auth.uid()) OR
    -- Or if you are already an owner
    exists ( select 1 from household_members where household_id = household_members.household_id and user_id = auth.uid() and role = 'owner')
);

-- BUDGETS
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households on delete cascade not null,
  amount numeric not null default 0,
  period_type text default 'monthly' check (period_type in ('monthly', 'weekly')),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.budgets enable row level security;

create policy "Members can view budgets" on budgets for select using ( is_member_of(household_id) );
create policy "Members can update budgets" on budgets for update using ( is_member_of(household_id) );
create policy "Members can insert budgets" on budgets for insert with check ( is_member_of(household_id) );

-- EXPENSES
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households on delete cascade not null,
  created_by uuid references public.profiles(id) not null,
  amount numeric not null,
  description text,
  transaction_date date default CURRENT_DATE,
  receipt_url text,
  receipt_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.expenses enable row level security;

create policy "Members can view expenses" on expenses for select using ( is_member_of(household_id) );
create policy "Members can insert expenses" on expenses for insert with check ( is_member_of(household_id) );
create policy "Members can update expenses" on expenses for update using ( is_member_of(household_id) );
create policy "Members can delete expenses" on expenses for delete using ( is_member_of(household_id) );

-- STORAGE (Receipts)
-- Note: You must create a 'receipts' bucket in Supabase Storage Dashboard manually or via API.
-- We can set up policies assuming the bucket exists.

insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "Receipts are viewable by household members" on storage.objects for select
using ( bucket_id = 'receipts' and (auth.role() = 'authenticated') ); 
-- Simplified for now. For strict security, we'd need to match path to household_id, e.g. "household_id/filename"

create policy "Authenticated users can upload receipts" on storage.objects for insert
with check ( bucket_id = 'receipts' and auth.role() = 'authenticated' );

-- TRIGGER for User Creation
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: Create Household safely
create or replace function create_household(name text)
returns json
language plpgsql
security definer
as $$
declare
  new_household_id uuid;
  new_household_name text;
  result json;
begin
  insert into public.households (name)
  values (create_household.name)
  returning id, public.households.name into new_household_id, new_household_name;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  select json_build_object('id', new_household_id, 'name', new_household_name, 'role', 'owner')
  into result;

  return result;
end;
$$;
