-- ============================================================
--  Тренажёр ЕНТ · матграмотность — схема базы данных
--  Выполнить один раз: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) ПРОФИЛИ (роль: student | teacher) -----------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  role       text not null default 'student' check (role in ('student','teacher')),
  created_at timestamptz not null default now()
);

-- Профиль создаётся автоматически при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Хелпер: текущий пользователь — учитель? (security definer, минует RLS)
create or replace function public.is_teacher()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

-- 2) ЗАДАНИЯ (выбор одного варианта) -------------------------
create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  body         text not null,            -- текст вопроса
  options      text[] not null,          -- варианты ответа (2–6)
  correct_index int not null,            -- индекс правильного (0-based)
  topic        text,                     -- тема (для деления по темам)
  explanation  text,                     -- пояснение (необязательно)
  is_active    boolean not null default true,
  created_by   uuid references auth.users,
  created_at   timestamptz not null default now()
);

-- 3) ПОПЫТКИ (каждый ответ ученика) --------------------------
create table if not exists public.attempts (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references auth.users on delete cascade,
  question_id  uuid not null references public.questions on delete cascade,
  selected_index int not null,
  is_correct   boolean not null,
  mode         text not null default 'practice' check (mode in ('practice','exam')),
  exam_id      uuid,                      -- группировка попыток одного пробного
  created_at   timestamptz not null default now()
);
create index if not exists attempts_student_idx  on public.attempts(student_id);
create index if not exists attempts_question_idx on public.attempts(question_id);

-- 4) СЕССИИ «ПРОБНЫЙ ЕНТ» ------------------------------------
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references auth.users on delete cascade,
  total       int not null default 0,
  correct     int not null default 0,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists exams_student_idx on public.exams(student_id);

-- ============================================================
--  RLS (Row Level Security)
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.questions enable row level security;
alter table public.attempts  enable row level security;
alter table public.exams     enable row level security;

-- profiles
drop policy if exists "profiles_read_own"    on public.profiles;
drop policy if exists "profiles_read_all_te" on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_read_own"    on public.profiles for select using (id = auth.uid());
create policy "profiles_read_all_te" on public.profiles for select using (public.is_teacher());
create policy "profiles_update_own"  on public.profiles for update using (id = auth.uid());

-- ВАЖНО: RLS-политика на UPDATE не ограничивает НАБОР колонок, поэтому без
-- колоночных прав ученик мог бы обновить свой profiles.role в 'teacher'.
-- Разрешаем менять только имя (роль меняет только админ через SQL/service_role).
revoke update on table public.profiles from anon, authenticated;
grant  update (full_name) on table public.profiles to authenticated;

-- questions
drop policy if exists "questions_read"        on public.questions;
drop policy if exists "questions_teacher_ins" on public.questions;
drop policy if exists "questions_teacher_upd" on public.questions;
drop policy if exists "questions_teacher_del" on public.questions;
create policy "questions_read"        on public.questions for select
  using (auth.uid() is not null and (is_active or public.is_teacher()));
create policy "questions_teacher_ins" on public.questions for insert with check (public.is_teacher());
create policy "questions_teacher_upd" on public.questions for update using (public.is_teacher());
create policy "questions_teacher_del" on public.questions for delete using (public.is_teacher());

-- attempts
drop policy if exists "attempts_insert_own"   on public.attempts;
drop policy if exists "attempts_read_own"     on public.attempts;
drop policy if exists "attempts_read_all_te"  on public.attempts;
create policy "attempts_insert_own"  on public.attempts for insert with check (student_id = auth.uid());
create policy "attempts_read_own"    on public.attempts for select using (student_id = auth.uid());
create policy "attempts_read_all_te" on public.attempts for select using (public.is_teacher());

-- exams
drop policy if exists "exams_manage_own"   on public.exams;
drop policy if exists "exams_read_all_te"  on public.exams;
create policy "exams_manage_own"  on public.exams for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "exams_read_all_te" on public.exams for select using (public.is_teacher());

-- ============================================================
--  СДЕЛАТЬ УЧИТЕЛЯ (выполнить ПОСЛЕ регистрации Ларисы):
--  update public.profiles set role = 'teacher'
--  where id = (select id from auth.users where email = 'ПОЧТА_ЛАРИСЫ');
-- ============================================================
