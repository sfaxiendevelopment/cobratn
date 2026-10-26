-- Private storage bucket for generated order PDFs.
-- The Edge Function uses the service role to upload PDFs and create expiring
-- signed download links. Do not make this bucket public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-pdfs', 'order-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
