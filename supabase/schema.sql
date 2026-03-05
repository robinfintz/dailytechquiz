-- Run this in Supabase SQL editor to create tables.

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  briefing text,
  created_at timestamptz not null default now()
);

-- If you already have quizzes, add the column:
-- alter table quizzes add column if not exists briefing text;

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_index smallint not null check (correct_index between 0 and 3)
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  score smallint not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists questions_quiz_id on questions(quiz_id);
create index if not exists attempts_quiz_id on attempts(quiz_id);
