-- Shared data. Clients may read through RLS; writes must use guarded RPCs.
create table public.rides (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 owner_name text not null, direction text not null check(direction in ('to','from')),
 pickup text not null check(length(btrim(pickup)) between 1 and 100),
 destination text not null check(length(btrim(destination)) between 1 and 100),
 ride_date date not null, departure_time time not null,
 vehicle text not null check(vehicle in ('Car','Bike')), capacity integer not null,
 seats integer not null, note text not null default '' check(length(note)<=240),
 cancelled boolean not null default false, created_at timestamptz not null default now(),
 check(capacity between 1 and case when vehicle='Bike' then 1 else 6 end),
 check(seats between 0 and capacity), check(pickup<>destination),
 check((direction='to' and destination='BRAC University, Merul Badda') or
       (direction='from' and pickup='BRAC University, Merul Badda'))
);
create index rides_board_idx on public.rides(ride_date,departure_time) where not cancelled;
create index rides_owner_idx on public.rides(owner_id);
create table public.ride_requests (
 id uuid primary key default gen_random_uuid(), ride_id uuid not null references public.rides(id),
 requester_id uuid not null references public.profiles(id), owner_id uuid not null references public.profiles(id),
 requester_name text not null, owner_name text not null,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), unique(ride_id,requester_id), check(requester_id<>owner_id)
);
create index ride_requests_requester_idx on public.ride_requests(requester_id);
create index ride_requests_owner_idx on public.ride_requests(owner_id);
create table public.messages (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.ride_requests(id),
 sender_id uuid references public.profiles(id), body text not null check(length(btrim(body)) between 1 and 500),
 created_at timestamptz not null default now()
);
create index messages_request_idx on public.messages(request_id,created_at,id);
create index messages_sender_idx on public.messages(sender_id);
create table public.preferred_destinations (
 user_id uuid primary key references public.profiles(id), name text not null check(length(btrim(name)) between 1 and 100),
 lat double precision not null check(lat between 23.5 and 24.1),
 lng double precision not null check(lng between 90.1 and 90.7),
 change_date date not null, changes integer not null check(changes between 1 and 2), updated_at timestamptz not null default now()
);
alter table public.rides enable row level security;
alter table public.ride_requests enable row level security;
alter table public.messages enable row level security;
alter table public.preferred_destinations enable row level security;
revoke all on public.rides, public.ride_requests, public.messages, public.preferred_destinations from public,anon,authenticated;
grant select on public.rides,public.ride_requests,public.messages,public.preferred_destinations to authenticated;
create policy rides_members_read on public.rides for select to authenticated using((select private.is_university_member()));
create policy requests_participants_read on public.ride_requests for select to authenticated
 using((select private.is_university_member()) and ((select auth.uid())=owner_id or (select auth.uid())=requester_id));
create policy messages_participants_read on public.messages for select to authenticated
 using((select private.is_university_member()) and exists(select 1 from public.ride_requests r where r.id=request_id and (r.owner_id=(select auth.uid()) or r.requester_id=(select auth.uid()))));
create policy destination_owner_read on public.preferred_destinations for select to authenticated
 using((select private.is_university_member()) and user_id=(select auth.uid()));

create function private.require_member() returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not private.is_university_member() then raise exception 'A verified BRAC University account is required.' using errcode='42501'; end if;
 return auth.uid();
end; $$;

create function private.create_ride(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); member_name text; existing public.rides; local_now timestamp:=now() at time zone 'Asia/Dhaka'; board date;
begin
 select * into existing from public.rides where id=p_id;
 if found then
  if existing.owner_id<>member_id then raise exception 'Ride ID is unavailable.'; end if;
  return existing.id;
 end if;
 board:=local_now::date + case when local_now::time>='21:00' then 1 else 0 end;
 if p_date is null or p_time is null or p_date<>board or (p_date+p_time)<=local_now then raise exception 'Choose a future departure on the active ride board.'; end if;
 select display_name into strict member_name from public.profiles where id=member_id;
 insert into public.rides(id,owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats,note)
 values(p_id,member_id,member_name,p_direction,btrim(p_pickup),btrim(p_destination),p_date,p_time,p_vehicle,p_seats,p_seats,coalesce(p_note,''));
 return p_id;
end; $$;

create function private.request_seat(p_ride_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); ride public.rides; request_id uuid; member_name text;
begin
 select * into ride from public.rides where id=p_ride_id for update;
 if not found then raise exception 'Ride not found.'; end if;
 if ride.owner_id=member_id then raise exception 'You cannot request your own ride.'; end if;
 select id into request_id from public.ride_requests where ride_id=p_ride_id and requester_id=member_id;
 if found then return request_id; end if;
 if ride.cancelled or ride.seats<1 or (ride.ride_date+ride.departure_time) <= (now() at time zone 'Asia/Dhaka') then raise exception 'This ride is no longer available.'; end if;
 select display_name into strict member_name from public.profiles where id=member_id;
 insert into public.ride_requests(ride_id,requester_id,owner_id,requester_name,owner_name)
 values(ride.id,member_id,ride.owner_id,member_name,ride.owner_name) returning id into request_id;
 insert into public.messages(request_id,body) values(request_id,'Ride request started. Discuss the fare and pickup details here.');
 return request_id;
end; $$;

create function private.decide_request(p_request_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); request public.ride_requests; ride public.rides; ride_key uuid;
begin
 if p_status is null or p_status not in ('accepted','declined') then raise exception 'Invalid request decision.'; end if;
 select ride_id into ride_key from public.ride_requests where id=p_request_id and owner_id=member_id;
 if not found then raise exception 'Only the ride owner can decide this request.' using errcode='42501'; end if;
 -- Always lock ride first. Acceptance and cancellation serialize on the same row.
 select * into ride from public.rides where id=ride_key for update;
 select * into request from public.ride_requests where id=p_request_id for update;
 if request.status=p_status then return; end if;
 if request.status<>'pending' or ride.cancelled or (ride.ride_date+ride.departure_time)<=(now() at time zone 'Asia/Dhaka') then raise exception 'This request is no longer pending or the ride has departed.'; end if;
 if p_status='accepted' then
  if ride.seats<1 then raise exception 'No seats remain.'; end if;
  update public.rides set seats=seats-1 where id=ride.id;
 end if;
 update public.ride_requests set status=p_status where id=p_request_id;
 insert into public.messages(request_id,body) values(p_request_id,case when p_status='accepted' then 'Ride request accepted. One seat is reserved.' else 'Ride request declined.' end);
end; $$;

create function private.cancel_ride(p_ride_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); ride public.rides;
begin
 select * into ride from public.rides where id=p_ride_id for update;
 if not found or ride.owner_id<>member_id then raise exception 'Only the ride owner can cancel this ride.' using errcode='42501'; end if;
 if ride.cancelled then return; end if;
 update public.rides set cancelled=true where id=p_ride_id;
 insert into public.messages(request_id,body) select id,'The ride owner cancelled this ride.' from public.ride_requests where ride_id=p_ride_id;
 update public.ride_requests set status='cancelled' where ride_id=p_ride_id;
end; $$;

create function private.send_message(p_id uuid,p_request_id uuid,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); request public.ride_requests; existing public.messages;
begin
 select * into request from public.ride_requests where id=p_request_id;
 if not found or (request.owner_id<>member_id and request.requester_id<>member_id) then raise exception 'This conversation is private.' using errcode='42501'; end if;
 if request.status in ('declined','cancelled') then raise exception 'This conversation is closed.'; end if;
 select * into existing from public.messages where id=p_id;
 if found then
  if existing.sender_id<>member_id or existing.request_id<>p_request_id then raise exception 'Message ID is unavailable.'; end if;
  return p_id;
 end if;
 insert into public.messages(id,request_id,sender_id,body) values(p_id,p_request_id,member_id,btrim(p_body));
 return p_id;
end; $$;

create function private.save_destination(p_name text,p_lat double precision,p_lng double precision) returns void language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); previous public.preferred_destinations; today date:=(now() at time zone 'Asia/Dhaka')::date;
begin
 -- Lock the profile too, so concurrent first saves cannot bypass the daily limit.
 perform 1 from public.profiles where id=member_id for update;
 select * into previous from public.preferred_destinations where user_id=member_id;
 if found and previous.change_date=today and previous.changes>=2 then raise exception 'You have used both destination changes today. Try again after midnight in Dhaka.'; end if;
 insert into public.preferred_destinations(user_id,name,lat,lng,change_date,changes)
 values(member_id,btrim(p_name),p_lat,p_lng,today,case when previous.change_date=today then previous.changes+1 else 1 end)
 on conflict(user_id) do update set name=excluded.name,lat=excluded.lat,lng=excluded.lng,change_date=excluded.change_date,changes=excluded.changes,updated_at=now();
end; $$;
revoke all on function private.require_member() from public,anon;
grant execute on function private.require_member() to authenticated;
revoke all on function private.create_ride(uuid,text,text,text,date,time,text,integer,text) from public,anon;
grant execute on function private.create_ride(uuid,text,text,text,date,time,text,integer,text) to authenticated;
create function public.create_ride(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text) returns uuid language sql security invoker set search_path='' as $$ select private.create_ride(p_id,p_direction,p_pickup,p_destination,p_date,p_time,p_vehicle,p_seats,p_note); $$;
revoke all on function public.create_ride(uuid,text,text,text,date,time,text,integer,text) from public,anon;
grant execute on function public.create_ride(uuid,text,text,text,date,time,text,integer,text) to authenticated;
revoke all on function private.request_seat(uuid) from public,anon;
grant execute on function private.request_seat(uuid) to authenticated;
create function public.request_seat(p_ride_id uuid) returns uuid language sql security invoker set search_path='' as $$ select private.request_seat(p_ride_id); $$;
revoke all on function public.request_seat(uuid) from public,anon;
grant execute on function public.request_seat(uuid) to authenticated;
revoke all on function private.decide_request(uuid,text) from public,anon;
grant execute on function private.decide_request(uuid,text) to authenticated;
create function public.decide_request(p_request_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$ select private.decide_request(p_request_id,p_status); $$;
revoke all on function public.decide_request(uuid,text) from public,anon;
grant execute on function public.decide_request(uuid,text) to authenticated;
revoke all on function private.cancel_ride(uuid) from public,anon;
grant execute on function private.cancel_ride(uuid) to authenticated;
create function public.cancel_ride(p_ride_id uuid) returns void language sql security invoker set search_path='' as $$ select private.cancel_ride(p_ride_id); $$;
revoke all on function public.cancel_ride(uuid) from public,anon;
grant execute on function public.cancel_ride(uuid) to authenticated;
revoke all on function private.send_message(uuid,uuid,text) from public,anon;
grant execute on function private.send_message(uuid,uuid,text) to authenticated;
create function public.send_message(p_id uuid,p_request_id uuid,p_body text) returns uuid language sql security invoker set search_path='' as $$ select private.send_message(p_id,p_request_id,p_body); $$;
revoke all on function public.send_message(uuid,uuid,text) from public,anon;
grant execute on function public.send_message(uuid,uuid,text) to authenticated;
revoke all on function private.save_destination(text,double precision,double precision) from public,anon;
grant execute on function private.save_destination(text,double precision,double precision) to authenticated;
create function public.save_destination(p_name text,p_lat double precision,p_lng double precision) returns void language sql security invoker set search_path='' as $$ select private.save_destination(p_name,p_lat,p_lng); $$;
revoke all on function public.save_destination(text,double precision,double precision) from public,anon;
grant execute on function public.save_destination(text,double precision,double precision) to authenticated;
