-- ============================================================================
-- HackPortal — seed.sql (idempotent). Run AFTER 0001_init.sql.
--
-- (b) Demo-account strategy: pure SQL. Supabase auth users are created with
--     crypt()/gen_salt('bf') (bcrypt) + matching auth.identities rows — the
--     canonical SQL way to create password users, no plaintext. This keeps C1
--     a true DB-only deliverable and fully reproducible from the repo.
--     Fallback if this errors on an auth.users NOT NULL column (version drift):
--     switch to a service-role Route Handler POST /api/seed using
--     supabase.auth.admin.createUser({ email, password, user_metadata }).
--
-- Fixed UUIDs so applications/reviews/assignments can reference the demo users.
--   ORG   11111111-...  organizer (reviewer)
--   HACK  22222222-...  hacker    (documented in README)
--   JUDGE 33333333-...  judge     (extra sample applicant)
--   MENT  44444444-...  mentor    (extra sample applicant)
--   VOL   55555555-...  volunteer (extra sample applicant)
-- ============================================================================

-- 1) Demo auth users. The on_auth_user_created trigger creates each profile;
--    role is set from raw_user_meta_data.track ('organizer' for the organizer).
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'organizer@demo.hackportal.dev', crypt('hackportal', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Demo Organizer","track":"organizer"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'hacker@demo.hackportal.dev', crypt('hackportal', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Demo Hacker","track":"hacker"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'jamie.judge@demo.hackportal.dev', crypt('hackportal', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Jamie Judge","track":"judge"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'morgan.mentor@demo.hackportal.dev', crypt('hackportal', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Morgan Mentor","track":"mentor"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'val.volunteer@demo.hackportal.dev', crypt('hackportal', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Val Volunteer","track":"volunteer"}'::jsonb, now(), now())
on conflict (id) do nothing;

-- 1b) auth.identities (idempotent). Supabase versions differ here: newer ones
--     key identities on (provider_id, provider) and REQUIRE provider_id (NOT NULL);
--     older ones also carry an `id` uuid column. We detect whether `id` exists and
--     insert the matching column set, so this runs on either version.
do $$
declare
  v_has_id boolean;
  r        record;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'identities' and column_name = 'id'
  ) into v_has_id;

  for r in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid,'organizer@demo.hackportal.dev'),
      ('22222222-2222-2222-2222-222222222222'::uuid,'hacker@demo.hackportal.dev'),
      ('33333333-3333-3333-3333-333333333333'::uuid,'jamie.judge@demo.hackportal.dev'),
      ('44444444-4444-4444-4444-444444444444'::uuid,'morgan.mentor@demo.hackportal.dev'),
      ('55555555-5555-5555-5555-555555555555'::uuid,'val.volunteer@demo.hackportal.dev')
    ) as u(id, email)
  loop
    -- skip if this user already has an email identity (idempotency)
    if exists (
      select 1 from auth.identities i where i.user_id = r.id and i.provider = 'email'
    ) then
      continue;
    end if;

    if v_has_id then
      insert into auth.identities
        (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values
        (gen_random_uuid(), r.id, r.id::text,
         format('{"sub":"%s","email":"%s"}', r.id, r.email)::jsonb,
         'email', now(), now(), now());
    else
      insert into auth.identities
        (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values
        (r.id, r.id::text,
         format('{"sub":"%s","email":"%s"}', r.id, r.email)::jsonb,
         'email', now(), now(), now());
    end if;
  end loop;
end $$;

-- 1c) GoTrue reads several auth.users token columns into non-nullable Go
--     strings. Rows created by raw SQL leave these NULL, so EVERY auth call
--     (signIn, admin listUsers, …) fails with
--     "Database error querying schema". Backfill NULL -> '' for all users.
--     Version-tolerant: only touches columns that actually exist.
do $$
declare
  cols text[] := array[
    'confirmation_token','recovery_token','email_change_token_new','email_change',
    'email_change_token_current','phone_change','phone_change_token','reauthentication_token'
  ];
  c text;
begin
  foreach c in array cols loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = c
    ) then
      execute format('update auth.users set %I = '''' where %I is null', c, c);
    end if;
  end loop;
end $$;

-- 2) form_fields — data-driven per-track questions (ADR-1).
insert into form_fields (type, key, label, kind, options, required, position) values
  -- hacker (richest form)
  ('hacker','full_name','Full name','text',null,true,1),
  ('hacker','email','Email','email',null,true,2),
  ('hacker','experience_level','Experience level','select','["Beginner","Intermediate","Advanced"]'::jsonb,true,3),
  ('hacker','skills','Skills','textarea',null,true,4),
  ('hacker','project_idea','Project idea','textarea',null,true,5),
  ('hacker','team_status','Team status','select','["Solo","Have a team","Looking for a team"]'::jsonb,true,6),
  ('hacker','dietary','Dietary needs','text',null,false,7),
  ('hacker','accessibility','Accessibility needs','textarea',null,false,8),
  -- judge
  ('judge','full_name','Full name','text',null,true,1),
  ('judge','email','Email','email',null,true,2),
  ('judge','expertise','Domain expertise','textarea',null,true,3),
  ('judge','availability','Judging availability','select','["Morning","Afternoon","Evening"]'::jsonb,true,4),
  ('judge','conflict_of_interest','Conflict of interest','textarea',null,false,5),
  -- mentor
  ('mentor','full_name','Full name','text',null,true,1),
  ('mentor','email','Email','email',null,true,2),
  ('mentor','area_of_expertise','Area of expertise','textarea',null,true,3),
  ('mentor','availability','Availability','select','["Weekdays","Weekends","Both"]'::jsonb,true,4),
  ('mentor','mentoring_style','Mentoring style','select','["Hands-on","Guiding","Resource-oriented"]'::jsonb,true,5),
  -- volunteer
  ('volunteer','full_name','Full name','text',null,true,1),
  ('volunteer','email','Email','email',null,true,2),
  ('volunteer','role_interest','Role interest','select','["Check-in","Logistics","AV/Sound","General"]'::jsonb,true,3),
  ('volunteer','shifts','Available shifts','select','["Friday","Saturday","Sunday"]'::jsonb,true,4),
  ('volunteer','experience','Relevant experience','textarea',null,false,5)
on conflict (type, key) do update
  set label = excluded.label, kind = excluded.kind, options = excluded.options,
      required = excluded.required, position = excluded.position;

-- 3) rubric_criteria.
insert into rubric_criteria (key, label, weight, max_score, position) values
  ('technical_depth','Technical depth',2,5,1),
  ('communication','Communication',1,5,2),
  ('impact','Potential impact',1,5,3)
on conflict (key) do update
  set label = excluded.label, weight = excluded.weight, max_score = excluded.max_score, position = excluded.position;

-- 4) Sample applications (all submitted; fixed app UUIDs for reviews/assignments).
insert into applications (id, user_id, type, status, responses, submitted_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','hacker','submitted',
   '{"full_name":"Demo Hacker","email":"hacker@demo.hackportal.dev","experience_level":"Intermediate","skills":"React, TypeScript, Python","project_idea":"An AI study buddy for college students.","team_status":"Looking for a team","dietary":"Vegetarian","accessibility":""}'::jsonb, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','33333333-3333-3333-3333-333333333333','judge','submitted',
   '{"full_name":"Jamie Judge","email":"jamie.judge@demo.hackportal.dev","expertise":"ML infrastructure, distributed systems","availability":"Afternoon","conflict_of_interest":"None"}'::jsonb, now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','44444444-4444-4444-4444-444444444444','mentor','submitted',
   '{"full_name":"Morgan Mentor","email":"morgan.mentor@demo.hackportal.dev","area_of_expertise":"Frontend, UX","availability":"Weekends","mentoring_style":"Guiding"}'::jsonb, now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','55555555-5555-5555-5555-555555555555','volunteer','submitted',
   '{"full_name":"Val Volunteer","email":"val.volunteer@demo.hackportal.dev","role_interest":"Logistics","shifts":"Saturday","experience":"Helped run 2 club events"}'::jsonb, now())
on conflict (user_id) do nothing;

-- 5) Reviews — organizer grades 2 of 4, leaving a visible coverage gap.
-- total = weighted average in [0, max_score]. HACK: (5*2+4+4)/4 = 4.5; JUDGE: (4*2+5+3)/4 = 4.0
-- (Database.md §2.4 writes "* max"; we use the weighted average instead so totals
--  stay within [0,5] and match application_overview.avg_score.)
insert into reviews (application_id, reviewer_id, scores, total, notes) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',
   '{"technical_depth":5,"communication":4,"impact":4}'::jsonb, 4.5, 'Strong project.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111',
   '{"technical_depth":4,"communication":5,"impact":3}'::jsonb, 4.0, 'Good domain expertise.')
on conflict (application_id, reviewer_id) do nothing;

-- 6) Assignments — organizer assigned to all 4 (2 reviewed, 2 pending).
insert into assignments (application_id, reviewer_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','11111111-1111-1111-1111-111111111111')
on conflict (application_id, reviewer_id) do nothing;

-- 7) Verify (run manually):
--   select display_name, type, status, avg_score, assigned_count, reviewed_count
--   from application_overview order by created_at;
