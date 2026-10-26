-- Run once on an existing database to update the store contact emails and
-- remove the unused contact phone setting.
update public.admin_settings
set contact_email = 'cobratn0@gmail.com, bahrimohsen26@gmail.com, mostfalahyeni@gmail.com';

alter table public.admin_settings
drop column if exists contact_phone;
