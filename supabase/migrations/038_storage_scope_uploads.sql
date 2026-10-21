-- رفع الملفات: فقط داخل مجلد طلبٍ أنت طرف فيه (عميل/منفّذ/أدمن)، وبحد حجم 10MB
-- (كان أي مستخدم مسجّل يقدر يرفع في أي مكان في المخزن بلا حد)
drop policy if exists "authenticated upload" on storage.objects;
drop policy if exists chat_media_upload_task_participants on storage.objects;
create policy chat_media_upload_task_participants on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] in ('chat','completions')
  and (
    public.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id::text = (storage.foldername(name))[2]
        and (t.client_id = auth.uid() or t.worker_id = auth.uid())
    )
  )
);
update storage.buckets set file_size_limit = 10485760 where id in ('chat-media','task-files');
