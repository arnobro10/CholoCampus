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
select set_config('request.jwt.claims',jsonb_build_object('sub',(select v from test_context where k='user1'),'role','authenticated','session_id',(select v from test_context where k='session1'))::text,true);
set local role authenticated;
do $$ declare v_ride_id uuid:=gen_random_uuid(); d date; t time; rejected boolean:=false;
begin
 d:= (now() at time zone 'Asia/Dhaka')::date + case when (now() at time zone 'Asia/Dhaka')::time>='21:00' then 1 else 0 end;
 t:=case when d>(now() at time zone 'Asia/Dhaka')::date then '08:30'::time else '23:59'::time end;
 perform public.publish_ride_at_locations(gen_random_uuid(),'to','A custom road','BRAC University, Merul Badda',d,t,'Car',1,'Custom point',50,23.766,90.388,23.77308,90.42447);
 if not exists(select 1 from public.rides where note='Custom point' and pickup_lat=23.766 and pickup_lng=90.388 and destination_lat=23.77308 and fare=50) then raise exception 'Custom pickup coordinates not saved'; end if;
 perform public.cancel_ride(id) from public.rides where owner_id=(select v from test_context where k='user1') and note='Custom point' and not cancelled;
 perform public.publish_ride_at_locations(gen_random_uuid(),'from','BRAC University, Merul Badda','Another custom road',d,t,'Car',1,'Return point',null,23.77308,90.42447,23.78,90.39);
 if not exists(select 1 from public.rides where note='Return point' and destination_lng=90.39 and pickup_lng=90.42447) then raise exception 'Custom destination coordinates not saved'; end if;
 perform public.cancel_ride(id) from public.rides where owner_id=(select v from test_context where k='user1') and note='Return point' and not cancelled;
 rejected:=false;
 begin perform public.publish_ride_at_locations(gen_random_uuid(),'to','Invalid road','BRAC University, Merul Badda',d,t,'Car',1,'',null,52,13,23.77308,90.42447); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Outside Dhaka pickup accepted'; end if;
 rejected:=false;
 begin perform public.publish_ride_at_locations(gen_random_uuid(),'from','BRAC University, Merul Badda','Custom road',d,t,'Car',1,'',null,23.8,90.45,23.78,90.39); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Wrong fixed campus point accepted'; end if;

 -- New clients can provide optional BDT fares; old create_ride remains compatible.
 perform public.publish_ride(gen_random_uuid(),'to','Dhanmondi 27','BRAC University, Merul Badda',d,t,'Car',1,'Fare test',80.50);
 if not exists(select 1 from public.rides where owner_id=(select v from test_context where k='user1') and fare=80.50) then raise exception 'Fare was not persisted'; end if;
 perform public.cancel_ride(id) from public.rides where owner_id=(select v from test_context where k='user1') and note='Fare test' and not cancelled;
 perform public.publish_ride(gen_random_uuid(),'to','Dhanmondi 27','BRAC University, Merul Badda',d,t,'Car',1,'Free ride',0);
 if not exists(select 1 from public.rides where note='Free ride' and fare=0) then raise exception 'Zero fare was not preserved'; end if;
 perform public.cancel_ride(id) from public.rides where owner_id=(select v from test_context where k='user1') and note='Free ride' and not cancelled;
 rejected:=false;
 begin perform public.publish_ride(gen_random_uuid(),'to','Dhanmondi 27','BRAC University, Merul Badda',d,t,'Car',1,'Invalid fare',-1); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Negative fare accepted'; end if;
 rejected:=false;
 begin perform public.publish_ride(gen_random_uuid(),'to','Dhanmondi 27','BRAC University, Merul Badda',d,t,'Car',1,'Invalid precision',1.234); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Fare precision silently rounded'; end if;

 rejected:=false;
 begin perform public.create_ride(gen_random_uuid(),'to','Dhanmondi 27','Wrong campus',d,t,'Car',1,''); exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Fixed campus validation failed'; end if;
 perform public.create_ride(v_ride_id,'to','Dhanmondi 27','BRAC University, Merul Badda',d,t,'Car',1,'Integration test');
 insert into test_context values('ride',v_ride_id);
 if not exists(select 1 from public.rides where rides.id=v_ride_id and seats=1) then raise exception 'Ride did not persist'; end if;
 perform public.create_ride(v_ride_id,'to','Dhanmondi 27','BRAC University, Merul Badda',d,t,'Car',1,'Integration test');
 rejected:=false;
 begin perform public.create_ride(gen_random_uuid(),'to','Dhanmondi 27','BRAC University, Merul Badda',d-1,t,'Car',1,''); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Past date accepted'; end if;
 perform public.save_destination('Home',23.76,90.38);
 perform public.save_destination('Home again',23.77,90.39);
 rejected:=false;
 begin perform public.save_destination('Third change',23.78,90.40); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Daily destination limit failed'; end if;
 rejected:=false;
 begin update public.rides set seats=6 where rides.id=v_ride_id; exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Client changed seats directly'; end if;
 rejected:=false;
 begin perform public.request_seat(v_ride_id); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Owner requested own ride'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select v from test_context where k='user2'),'role','authenticated','session_id',(select v from test_context where k='session2'))::text,true);
set local role authenticated;
insert into test_context select 'request2',public.request_seat(v) from test_context where k='ride';
do $$ declare r uuid:=(select v from test_context where k='request2'); m uuid:=gen_random_uuid(); rejected boolean:=false;
begin
 if public.request_seat((select v from test_context where k='ride'))<>r then raise exception 'Duplicate request was created'; end if;
 perform public.send_message(m,r,'Hello from the passenger');
 perform public.send_message(m,r,'Hello from the passenger');
 if (select count(*) from public.messages where id=m)<>1 then raise exception 'Message retry duplicated'; end if;
 begin perform public.decide_request(r,'accepted'); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Passenger accepted own request'; end if;
 if (select count(*) from public.preferred_destinations)<>0 then raise exception 'Private destination leaked'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select v from test_context where k='user3'),'role','authenticated','session_id',(select v from test_context where k='session3'))::text,true);
set local role authenticated;
do $$ declare rejected boolean:=false;
begin
 if (select count(*) from public.ride_requests where id=(select v from test_context where k='request2'))<>0 then raise exception 'Private request leaked'; end if;
 if (select count(*) from public.messages where request_id=(select v from test_context where k='request2'))<>0 then raise exception 'Private chat leaked'; end if;
 begin perform public.send_message(gen_random_uuid(),(select v from test_context where k='request2'),'Intrusion'); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Nonparticipant sent a message'; end if;
 rejected:=false;
 begin perform public.cancel_ride((select v from test_context where k='ride')); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Nonowner cancelled ride'; end if;
end $$;
insert into test_context select 'request3',public.request_seat(v) from test_context where k='ride';
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select v from test_context where k='user1'),'role','authenticated','session_id',(select v from test_context where k='session1'))::text,true);
set local role authenticated;
do $$ declare rejected boolean:=false;
begin
 perform public.decide_request((select v from test_context where k='request2'),'accepted');
 perform public.decide_request((select v from test_context where k='request2'),'accepted');
 if (select seats from public.rides where id=(select v from test_context where k='ride'))<>0 then raise exception 'Seat count is incorrect'; end if;
 begin perform public.decide_request((select v from test_context where k='request3'),'accepted'); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Ride oversold'; end if;
 perform public.decide_request((select v from test_context where k='request3'),'declined');
 perform public.cancel_ride((select v from test_context where k='ride'));
 if exists(select 1 from public.ride_requests where ride_id=(select v from test_context where k='ride') and status<>'cancelled') then raise exception 'Cancellation did not propagate'; end if;
 if not exists(select 1 from public.messages where request_id=(select v from test_context where k='request2') and body='Hello from the passenger') then raise exception 'Chat history was lost'; end if;
end $$;
reset role;
-- A university-looking JWT without an actual active session cannot write or read.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select v from test_context where k='user1'),'role','authenticated','session_id',gen_random_uuid())::text,true);
set local role authenticated;
do $$ declare rejected boolean:=false;
begin
 if exists(select 1 from public.rides) then raise exception 'Invalid session read rides'; end if;
 begin perform public.request_seat((select v from test_context where k='ride')); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Invalid session wrote data'; end if;
end $$;
reset role;
select 'Shared database integration checks passed' as result;
rollback;
