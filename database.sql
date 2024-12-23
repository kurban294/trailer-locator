-- Create the trailer_locations table
create table trailer_locations (
  id bigint generated by default as identity primary key,
  trailer_number text not null,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index for faster searches
create index idx_trailer_number on trailer_locations(trailer_number);

-- Enable Row Level Security (RLS)
alter table trailer_locations enable row level security;

-- Create a policy that allows all operations
create policy "Enable all operations for all users" on trailer_locations
  for all
  using (true)
  with check (true);
