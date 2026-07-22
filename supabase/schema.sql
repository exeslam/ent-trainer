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
--  СЕРВЕРНАЯ ПРОВЕРКА ОТВЕТОВ (правильный ответ не приходит ученику)
-- ============================================================
-- Правильные ответы живут отдельно и доступны ТОЛЬКО учителю/админу.
create table if not exists public.answer_keys (
  question_id   uuid primary key references public.questions(id) on delete cascade,
  correct_index int not null,
  explanation   text
);
alter table public.answer_keys enable row level security;
drop policy if exists "answer_keys_admin_all" on public.answer_keys;
create policy "answer_keys_admin_all" on public.answer_keys for all
  using (public.is_teacher()) with check (public.is_teacher());

-- Снимок правильного ответа на попытке — чтобы кабинет/разбор работали
-- без доступа ученика к answer_keys.
alter table public.attempts add column if not exists correct_index int;
alter table public.attempts add column if not exists explanation  text;

-- Тренировка: сервер проверяет ответ и записывает попытку.
create or replace function public.answer_practice(p_question_id uuid, p_selected_index int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ci int; expl text; ok boolean;
begin
  if auth.uid() is null then raise exception 'auth required' using errcode='42501'; end if;
  select correct_index, explanation into ci, expl from public.answer_keys where question_id = p_question_id;
  if not found then raise exception 'question not found' using errcode='P0002'; end if;
  ok := (p_selected_index = ci);
  insert into public.attempts(student_id, question_id, selected_index, is_correct, mode, correct_index, explanation)
    values (auth.uid(), p_question_id, p_selected_index, ok, 'practice', ci, expl);
  return jsonb_build_object('is_correct', ok, 'correct_index', ci, 'explanation', expl);
end; $$;
revoke all on function public.answer_practice(uuid,int) from public, anon;
grant execute on function public.answer_practice(uuid,int) to authenticated;

-- Пробный ЕНТ: сервер оценивает целиком и возвращает разбор.
create or replace function public.submit_exam(p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_exam uuid; v_total int; v_correct int := 0;
  item jsonb; qid uuid; sel int; ci int; expl text; ok boolean; review jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'auth required' using errcode='42501'; end if;
  v_total := coalesce(jsonb_array_length(p_answers),0);
  insert into public.exams(student_id, total, correct, started_at, finished_at)
    values (auth.uid(), v_total, 0, now(), now()) returning id into v_exam;
  for item in select * from jsonb_array_elements(p_answers) loop
    qid := (item->>'question_id')::uuid;
    sel := nullif(item->>'selected_index','')::int;
    select correct_index, explanation into ci, expl from public.answer_keys where question_id = qid;
    ok := (sel is not null and sel = ci);
    if ok then v_correct := v_correct + 1; end if;
    if sel is not null then
      insert into public.attempts(student_id, question_id, selected_index, is_correct, mode, exam_id, correct_index, explanation)
        values (auth.uid(), qid, sel, ok, 'exam', v_exam, ci, expl);
    end if;
    review := review || jsonb_build_object('question_id',qid,'selected_index',sel,'correct_index',ci,'is_correct',ok,'explanation',expl);
  end loop;
  update public.exams set correct = v_correct where id = v_exam;
  return jsonb_build_object('exam_id',v_exam,'total',v_total,'correct',v_correct,'review',review);
end; $$;
revoke all on function public.submit_exam(jsonb) from public, anon;
grant execute on function public.submit_exam(jsonb) to authenticated;

-- Админ: создать/изменить вопрос вместе с ключом ответа (атомарно).
create or replace function public.upsert_question(
  p_id uuid, p_body text, p_options text[], p_correct_index int, p_explanation text, p_is_active boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_teacher() then raise exception 'admin only' using errcode='42501'; end if;
  if p_id is null then
    insert into public.questions(body, options, correct_index, explanation, is_active, created_by)
      values (p_body, p_options, p_correct_index, p_explanation, coalesce(p_is_active,true), auth.uid())
      returning id into v_id;
  else
    update public.questions set body=p_body, options=p_options,
      correct_index=p_correct_index, explanation=p_explanation, is_active=coalesce(p_is_active,true)
      where id=p_id;
    v_id := p_id;
  end if;
  insert into public.answer_keys(question_id, correct_index, explanation)
    values (v_id, p_correct_index, p_explanation)
    on conflict (question_id) do update set correct_index=excluded.correct_index, explanation=excluded.explanation;
  return v_id;
end; $$;
revoke all on function public.upsert_question(uuid,text,text[],int,text,boolean) from public, anon;
grant execute on function public.upsert_question(uuid,text,text[],int,text,boolean) to authenticated;

-- ЗАКРЫТЬ УТЕЧКУ: клиент не может читать правильный ответ из questions.
-- ВАЖНО: табличный GRANT SELECT перекрывает колоночный REVOKE, поэтому отзываем
-- select на всю таблицу и возвращаем ТОЛЬКО безопасные колонки (без correct_index/explanation).
revoke select on public.questions from anon, authenticated;
grant  select (id, body, options, is_active, topic, created_by, created_at) on public.questions to authenticated;

-- ============================================================
--  СДЕЛАТЬ УЧИТЕЛЯ (выполнить ПОСЛЕ регистрации Ларисы):
--  update public.profiles set role = 'teacher'
--  where id = (select id from auth.users where email = 'ПОЧТА_ЛАРИСЫ');
-- ============================================================
