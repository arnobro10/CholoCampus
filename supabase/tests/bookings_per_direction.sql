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
declare driver uuid:=(select v from test_context where k='user1'); other_driver uuid:=(select v from test_context where k='user2'); passenger uuid:=(select v from test_context where k='user3');
 outbound uuid:=gen_random_uuid(); inbound uuid:=gen_random_uuid(); alternative uuid:=gen_random_uuid(); booking uuid:=gen_random_uuid();
begin
 insert into public.rides(id,owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats) values
 (outbound,driver,'Driver','to','Home','BRAC University, Merul Badda',current_date+2,'12:00','Car',2,2),
 (inbound,driver,'Driver','from','BRAC University, Merul Badda','Home',current_date+2,'18:00','Car',2,2),
 (alternative,other_driver,'Other driver','to','Home','BRAC University, Merul Badda',current_date+2,'12:00','Car',2,2);
 insert into public.ride_requests(id,ride_id,requester_id,owner_id,requester_name,owner_name,status) values
 (booking,outbound,passenger,driver,'Passenger','Driver','pending'),
 (gen_random_uuid(),inbound,passenger,driver,'Passenger','Driver','accepted');
 begin
  insert into public.ride_requests(ride_id,requester_id,owner_id,requester_name,owner_name) values
  (alternative,passenger,other_driver,'Passenger','Other driver');
  raise exception 'Second outbound booking was allowed';
 exception when unique_violation then null;
 end;
 update public.ride_requests set status='cancelled' where id=booking;
 insert into public.ride_requests(ride_id,requester_id,owner_id,requester_name,owner_name) values
 (alternative,passenger,other_driver,'Passenger','Other driver');
end; $$;
rollback;
