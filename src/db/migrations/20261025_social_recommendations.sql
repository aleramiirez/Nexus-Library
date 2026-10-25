-- ==============================================================================
-- Migración: Amigos y Buzón Literario de Recomendaciones P2P
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Tabla de Amistades (Friendships)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_friendship unique (requester_id, addressee_id),
  constraint no_self_friendship check (requester_id <> addressee_id)
);

create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);
create index if not exists idx_friendships_status on public.friendships(status);

alter table public.friendships enable row level security;

-- Políticas RLS para friendships
drop policy if exists "Users can see their own friendships" on public.friendships;
create policy "Users can see their own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can send friend requests" on public.friendships;
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Users can update their friendships" on public.friendships;
create policy "Users can update their friendships"
  on public.friendships for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

drop policy if exists "Users can delete their friendships" on public.friendships;
create policy "Users can delete their friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- 2. Tabla de Recomendaciones de Libros (Book Recommendations)
create table if not exists public.book_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  book_data jsonb not null,
  note text default '',
  status text not null default 'unread' check (status in ('unread', 'read', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_recommendation check (sender_id <> receiver_id)
);

create index if not exists idx_book_recs_receiver on public.book_recommendations(receiver_id);
create index if not exists idx_book_recs_sender on public.book_recommendations(sender_id);
create index if not exists idx_book_recs_status on public.book_recommendations(status);

alter table public.book_recommendations enable row level security;

-- Políticas RLS para book_recommendations
drop policy if exists "Users can view recommendations sent or received" on public.book_recommendations;
create policy "Users can view recommendations sent or received"
  on public.book_recommendations for select
  using (auth.uid() = receiver_id or auth.uid() = sender_id);

drop policy if exists "Users can send book recommendations" on public.book_recommendations;
create policy "Users can send book recommendations"
  on public.book_recommendations for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Receivers can update recommendation status" on public.book_recommendations;
create policy "Receivers can update recommendation status"
  on public.book_recommendations for update
  using (auth.uid() = receiver_id);

drop policy if exists "Users can delete recommendations" on public.book_recommendations;
create policy "Users can delete recommendations"
  on public.book_recommendations for delete
  using (auth.uid() = receiver_id or auth.uid() = sender_id);
