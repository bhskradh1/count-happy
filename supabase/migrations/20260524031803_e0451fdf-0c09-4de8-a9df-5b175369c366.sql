
-- =================== PROFILES ===================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  score int not null default 1000,
  rank text not null default '🥉 Bronze Aspirant',
  created_at timestamptz not null default now()
);
create unique index profiles_display_name_lower_idx on public.profiles (lower(display_name));

alter table public.profiles enable row level security;

create policy "Profiles are viewable by anyone authenticated"
  on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  candidate text;
  suffix int := 0;
begin
  base_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1),
    'aspirant'
  );
  candidate := base_name;
  while exists (select 1 from public.profiles where lower(display_name) = lower(candidate)) loop
    suffix := suffix + 1;
    candidate := base_name || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, display_name) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =================== LEADERBOARD ===================
create table public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  score int not null default 0,
  streak int not null default 0,
  accuracy int not null default 0,
  mode text not null default 'SOLO',
  exam text not null default 'IOE',
  created_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;
create policy "Leaderboard is viewable by anyone authenticated"
  on public.leaderboard for select to authenticated using (true);
create policy "Users can insert their own leaderboard entry"
  on public.leaderboard for insert to authenticated with check (auth.uid() = user_id);

-- =================== BATTLE HISTORY ===================
create table public.battle_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player text not null,
  opponent text not null,
  mode text not null,
  score int not null default 0,
  streak int not null default 0,
  result text not null check (result in ('WIN','LOSS')),
  created_at timestamptz not null default now()
);
alter table public.battle_history enable row level security;
create policy "Battle history is viewable by anyone authenticated"
  on public.battle_history for select to authenticated using (true);
create policy "Users can insert their own battle history"
  on public.battle_history for insert to authenticated with check (auth.uid() = user_id);

-- =================== COMMUNITY QUESTIONS ===================
create table public.community_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  subject text not null,
  exam text not null,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null default 'No explanation provided.',
  author text not null default 'Anonymous Scholar',
  created_at timestamptz not null default now()
);
alter table public.community_questions enable row level security;
create policy "Community questions are viewable by anyone authenticated"
  on public.community_questions for select to authenticated using (true);
create policy "Authenticated users can contribute community questions"
  on public.community_questions for insert to authenticated with check (auth.uid() = author_id);

-- Seed two starter community questions
insert into public.community_questions (subject, exam, question, options, correct_index, explanation, author) values
('Physics','IOE','A simple pendulum of length L is placed inside a lift falling with acceleration g/3. What is its new time period of oscillation?',
 '["T = 2π√(3L/2g)","T = 2π√(L/g)","T = 2π√(3L/4g)","T = 2π√(L/3g)"]'::jsonb, 0,
 'The effective acceleration in a downward accelerating lift is g_eff = g - a = g - g/3 = 2g/3. The time period is T = 2π√(L/g_eff) = 2π√(L / (2g/3)) = 2π√(3L/2g).',
 'Prof. Ghimire'),
('Chemistry','BOTH','According to Bronsted-Lowry concept, which of the following acts as both conjugate acid and conjugate base?',
 '["H2O","SO4(2-)","NH4(+)","H2SO4"]'::jsonb, 0,
 'H2O is amphiprotic; it can gain a proton to become H3O+ (conjugate acid role) or lose a proton to become OH- (conjugate base role).',
 'CEE Gold Medalist');

-- =================== ONLINE PRESENCE ===================
create table public.online_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  score int not null default 1000,
  rank text not null default '🥉 Bronze Aspirant',
  last_active timestamptz not null default now()
);
alter table public.online_presence enable row level security;
create policy "Presence is viewable by anyone authenticated"
  on public.online_presence for select to authenticated using (true);
create policy "Users can upsert their own presence"
  on public.online_presence for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own presence"
  on public.online_presence for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete their own presence"
  on public.online_presence for delete to authenticated using (auth.uid() = user_id);

-- =================== DUEL INVITES ===================
create table public.duel_invites (
  lobby_id text primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  exam text not null default 'IOE',
  subject text not null default 'All',
  custom_topic text not null default '',
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DECLINED')),
  num_questions int not null default 10,
  total_questions int not null default 10,
  created_at timestamptz not null default now()
);
alter table public.duel_invites enable row level security;
create policy "Invite participants can read invite"
  on public.duel_invites for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Senders can create invites"
  on public.duel_invites for insert to authenticated with check (auth.uid() = sender_id);
create policy "Participants can update invite"
  on public.duel_invites for update to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- =================== DUEL LOBBIES ===================
create table public.duel_lobbies (
  lobby_id text primary key,
  host_id uuid not null references auth.users(id) on delete cascade,
  host_name text not null,
  host_score int not null default 1000,
  host_index int not null default 0,
  host_consecutive_wrong int not null default 0,
  guest_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null default 'Challenger',
  guest_score int not null default 1000,
  guest_index int not null default 0,
  guest_consecutive_wrong int not null default 0,
  status text not null default 'WAITING' check (status in ('WAITING','ACTIVE','COMPLETED')),
  exam text not null default 'IOE',
  subject text not null default 'All',
  custom_topic text not null default '',
  questions jsonb not null default '[]'::jsonb,
  rope_position int not null default 0,
  num_questions int not null default 10,
  winner_id uuid references auth.users(id),
  last_update timestamptz not null default now()
);
alter table public.duel_lobbies enable row level security;
create policy "Lobby participants can read lobby"
  on public.duel_lobbies for select to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);
create policy "Hosts can create lobbies"
  on public.duel_lobbies for insert to authenticated with check (auth.uid() = host_id);
create policy "Lobby participants can update lobby"
  on public.duel_lobbies for update to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);
