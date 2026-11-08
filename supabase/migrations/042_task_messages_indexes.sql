-- admin task detail: recent messages + per-task ordered transcript
create index if not exists idx_task_messages_created_at on public.task_messages (created_at desc);
create index if not exists idx_task_messages_task_created on public.task_messages (task_id, created_at);
