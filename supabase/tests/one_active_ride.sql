-- Transactional integration test: all fixtures, including Auth rows, roll back.
begin;
create temporary table test_context(k text primary key,v uuid);
grant select,insert on test_context to authenticated;
do $$ declare n integer; u uuid; s uuid; email_address text;
begin
 for n in 1..3 loop
  u:=gen_random_uuid();s:=gen_random_uuid();email_address:='cloud-test-'||u||case when n=1 then '@bracu.ac.bd' else '@g.bracu.ac.bd' end;
  insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values(u,email_address,now(),'{"provider":"google"}');
  insert into auth.identities(user_id,provider,provider_id,identity_data) values(u,'google',u::text,jsonb_build_object('email',email_address,'email_verified',true));
  insert into auth.sessions(id,user_id,created_at) values(s,u,now());
  insert into public.profiles(id,display_name) values(u,'Cloud test '||n);
  insert into test_context values('user'||n,u),('session'||n,s);
 end loop;
end $$;
do $$
declare u uuid:=(select v from test_context where k='user1'); first_id uuid:=gen_random_uuid();
begin
 insert into public.rides(id,owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats)
 values(first_id,u,'Test','to','Home','BRAC University, Merul Badda',current_date+2,'12:00','Car',1,1);
 begin
  insert into public.rides(owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats)
  values(u,'Test','to','Other home','BRAC University, Merul Badda',current_date+3,'12:00','Car',1,1);
  raise exception 'Second active offer was allowed';
 exception when unique_violation then null;
 end;
 -- The opposite direction is independently available.
 insert into public.rides(owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats)
 values(u,'Test','from','BRAC University, Merul Badda','Home',current_date+2,'18:00','Car',1,1);
 -- A sold-out offer still counts as active.
 update public.rides set seats=0 where id=first_id;
 begin
  insert into public.rides(owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats)
  values(u,'Test','to','Other home','BRAC University, Merul Badda',current_date+3,'12:00','Car',1,1);
  raise exception 'Sold-out active offer was ignored';
 exception when unique_violation then null;
 end;
 update public.rides set cancelled=true where id=first_id;
 insert into public.rides(owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats)
 values(u,'Test','to','Other home','BRAC University, Merul Badda',current_date+3,'12:00','Car',1,1);
 -- History does not count as active.
 insert into public.rides(owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats)
 values(u,'Test','to','Old home','BRAC University, Merul Badda',current_date-2,'12:00','Car',1,1);
end; $$;
rollback;
