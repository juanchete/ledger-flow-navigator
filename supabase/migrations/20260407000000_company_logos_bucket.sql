-- Create bucket for invoice company logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2 MB
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do nothing;

-- RLS policies for company-logos bucket
create policy "Public read company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

create policy "Auth users can upload company logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos');

create policy "Auth users can update own company logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and owner = auth.uid());

create policy "Auth users can delete own company logos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and owner = auth.uid());
