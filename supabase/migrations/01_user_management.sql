-- Drop existing objects if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop trigger if exists update_profiles_updated_at on profiles;
drop function if exists update_updated_at_column();
drop table if exists audit_logs;
drop table if exists trailer_locations;
drop table if exists profiles;
drop type if exists user_role;
drop type if exists user_status;

-- Create custom types
create type user_role as enum ('admin', 'user');
create type user_status as enum ('active', 'inactive');

-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  role user_role default 'user'::user_role,
  status user_status default 'active'::user_status,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trailer locations table
create table trailer_locations (
  id bigint generated by default as identity primary key,
  trailer_number text not null,
  latitude double precision not null,
  longitude double precision not null,
  updated_by uuid references auth.users not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create audit logs table
create table audit_logs (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users not null,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;
alter table audit_logs enable row level security;
alter table trailer_locations enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Admins can do everything"
  on profiles for all
  using (
    auth.uid() in (
      select id from profiles where role = 'admin'::user_role
    )
  )
  with check (
    auth.uid() in (
      select id from profiles where role = 'admin'::user_role
    )
  );

-- Create policies for trailer locations
create policy "Users can view all trailer locations"
  on trailer_locations for select
  using (true);

create policy "Users can insert trailer locations"
  on trailer_locations for insert
  with check (auth.uid() = updated_by);

create policy "Users can update their own trailer locations"
  on trailer_locations for update
  using (auth.uid() = updated_by);

-- Create policies for audit logs
create policy "Users can view own audit logs"
  on audit_logs for select
  using (auth.uid() = user_id);

create policy "Admins can view all audit logs"
  on audit_logs for select
  using (
    auth.uid() in (
      select id from profiles where role = 'admin'::user_role
    )
  );

create policy "Insert audit logs"
  on audit_logs for insert
  with check (auth.uid() = user_id);

-- Functions
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name', ''), coalesce(new.raw_user_meta_data->>'last_name', ''));
  return new;
exception
  when others then
    return new;
end;
$$ language plpgsql security definer;

-- Function to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at_column();
