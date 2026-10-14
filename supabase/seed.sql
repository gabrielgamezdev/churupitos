-- Datos inventados para desarrollar en local. Nunca datos reales (ADR 0004).
--
-- `npx supabase db reset` borra la base local y la rehace con las migraciones y
-- con este archivo. Crea las dos cuentas de prueba del README:
--   ana@ejemplo.test  y  beto@ejemplo.test, contraseña churupitos-dev-1

-- Auth no tiene una función SQL para crear usuarios, así que se insertan como lo
-- haría su API. Las columnas de *tokens* van como cadena vacía y no como NULL:
-- Auth las lee como texto y falla al iniciar sesión si están a NULL.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000',
  dev.id,
  'authenticated',
  'authenticated',
  dev.email,
  extensions.crypt('churupitos-dev-1', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'ana@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000b2'::uuid, 'beto@ejemplo.test')
) as dev (id, email);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email like '%@ejemplo.test';

insert into public.household_members (user_id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'Ana'),
  ('00000000-0000-4000-8000-0000000000b2', 'Beto');
