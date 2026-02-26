create extension if not exists pgcrypto;

create table if not exists document_summaries (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  public_url text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at_document_summaries()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at_document_summaries on document_summaries;

create trigger trg_set_updated_at_document_summaries
before update on document_summaries
for each row
execute procedure set_updated_at_document_summaries();
