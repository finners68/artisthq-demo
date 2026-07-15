-- LockleadHQ initial schema

create extension if not exists "pgcrypto";

-- Workspaces (one shared team dataset per artist/team)
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'LockleadHQ',
  created_at timestamptz not null default now()
);

-- Links auth.users to workspaces
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Shows (one row per date per workspace)
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  show_date date not null,
  name text,
  colour text default 'orange',
  venue text,
  set_time text,
  departure_airport text,
  terminal text,
  departure_time text,
  flight_info text,
  arrival_airport text,
  arrival_time text,
  docs_notes text,
  no_transport boolean default false,
  airport_hotel_driver_name text,
  airport_hotel_driver_phone text,
  airport_hotel_transfer text,
  hotel text,
  hotel_address text,
  hotel_notes text,
  hotel_venue_driver_name text,
  hotel_venue_driver_phone text,
  hotel_venue_transfer text,
  notes text,
  trip_done jsonb not null default '{}',
  trip_active boolean not null default false,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, show_date)
);

create index shows_workspace_id_idx on public.shows (workspace_id);
create index shows_show_date_idx on public.shows (show_date);

-- Boarding cards / documents (files in Storage)
create table public.show_files (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  mime_type text,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index show_files_show_id_idx on public.show_files (show_id);

-- Content / action pieces per show
create table public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null default 'Instagram',
  title text not null,
  notes text,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index content_pieces_show_id_idx on public.content_pieces (show_id);

-- Ideas
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legacy_id text,
  cat text not null,
  title text not null,
  note text,
  liked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index ideas_workspace_id_idx on public.ideas (workspace_id);

-- Notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legacy_id text,
  text text not null,
  created_at timestamptz not null default now()
);

create index notes_workspace_id_idx on public.notes (workspace_id, created_at desc);

-- updated_at trigger for shows
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shows_updated_at
  before update on public.shows
  for each row execute function public.set_updated_at();

-- Helper: workspace ids for current user
create or replace function public.user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

-- RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.shows enable row level security;
alter table public.show_files enable row level security;
alter table public.content_pieces enable row level security;
alter table public.ideas enable row level security;
alter table public.notes enable row level security;

-- workspaces
create policy "Members can view their workspaces"
  on public.workspaces for select
  using (id in (select public.user_workspace_ids()));

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() is not null);

create policy "Owners can update workspaces"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

-- workspace_members
create policy "Members can view workspace membership"
  on public.workspace_members for select
  using (workspace_id in (select public.user_workspace_ids()));

create policy "Users can join workspace on signup or owner adds"
  on public.workspace_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

-- shows
create policy "Members can manage shows"
  on public.shows for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

-- show_files
create policy "Members can manage show files"
  on public.show_files for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

-- content_pieces
create policy "Members can manage content pieces"
  on public.content_pieces for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

-- ideas
create policy "Members can manage ideas"
  on public.ideas for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

-- notes
create policy "Members can manage notes"
  on public.notes for all
  using (workspace_id in (select public.user_workspace_ids()))
  with check (workspace_id in (select public.user_workspace_ids()));

-- Storage bucket for show documents
insert into storage.buckets (id, name, public)
values ('show-documents', 'show-documents', false)
on conflict (id) do nothing;

-- Storage policies: path must start with workspace_id the user belongs to
create policy "Members can read show documents"
  on storage.objects for select
  using (
    bucket_id = 'show-documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
  );

create policy "Members can upload show documents"
  on storage.objects for insert
  with check (
    bucket_id = 'show-documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
  );

create policy "Members can update show documents"
  on storage.objects for update
  using (
    bucket_id = 'show-documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
  );

create policy "Members can delete show documents"
  on storage.objects for delete
  using (
    bucket_id = 'show-documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_workspace_ids())
  );

-- Realtime publication
alter publication supabase_realtime add table public.shows;
alter publication supabase_realtime add table public.show_files;
alter publication supabase_realtime add table public.content_pieces;
alter publication supabase_realtime add table public.ideas;
alter publication supabase_realtime add table public.notes;
