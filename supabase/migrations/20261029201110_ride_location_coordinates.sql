alter table public.rides
 add column pickup_lat double precision,
 add column pickup_lng double precision,
 add column destination_lat double precision,
 add column destination_lng double precision,
 add constraint rides_pickup_coordinates check((pickup_lat is null and pickup_lng is null) or (pickup_lat is not null and pickup_lng is not null and pickup_lat between 23.5 and 24.1 and pickup_lng between 90.1 and 90.7)),
 add constraint rides_destination_coordinates check((destination_lat is null and destination_lng is null) or (destination_lat is not null and destination_lng is not null and destination_lat between 23.5 and 24.1 and destination_lng between 90.1 and 90.7));
-- Backfill only known legacy labels. Never invent a coordinate for an unknown address.
update public.rides r set pickup_lat=p.lat,pickup_lng=p.lng from (values ('BRAC University, Merul Badda',23.77308,90.42447),('Dhanmondi 27',23.7571,90.3751),('Uttara Sector 7',23.8705,90.3985),('Mirpur 10',23.8067,90.3686),('Bashundhara R/A',23.8152,90.4333),('Mohakhali DOHS',23.7894,90.4019),('Rampura',23.7611,90.4202),('Gulshan 2',23.7937,90.4146),('Banasree',23.7657,90.4352),('Farmgate',23.7577,90.3889)) as p(name,lat,lng) where r.pickup=p.name;
update public.rides r set destination_lat=p.lat,destination_lng=p.lng from (values ('BRAC University, Merul Badda',23.77308,90.42447),('Dhanmondi 27',23.7571,90.3751),('Uttara Sector 7',23.8705,90.3985),('Mirpur 10',23.8067,90.3686),('Bashundhara R/A',23.8152,90.4333),('Mohakhali DOHS',23.7894,90.4019),('Rampura',23.7611,90.4202),('Gulshan 2',23.7937,90.4146),('Banasree',23.7657,90.4352),('Farmgate',23.7577,90.3889)) as p(name,lat,lng) where r.destination=p.name;
create function private.publish_ride_at_locations(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text,p_fare numeric,p_pickup_lat double precision,p_pickup_lng double precision,p_destination_lat double precision,p_destination_lng double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); member_name text; existing public.rides; local_now timestamp:=now() at time zone 'Asia/Dhaka'; board date;
begin
 if p_pickup_lat is null or p_pickup_lng is null or p_destination_lat is null or p_destination_lng is null
 or not(p_pickup_lat between 23.5 and 24.1 and p_pickup_lng between 90.1 and 90.7
 and p_destination_lat between 23.5 and 24.1 and p_destination_lng between 90.1 and 90.7) then
 raise exception 'Choose pickup and destination locations within Dhaka.'; end if;
 if (p_direction='to' and (abs(p_destination_lat-23.77308)>0.00001 or abs(p_destination_lng-90.42447)>0.00001))
 or (p_direction='from' and (abs(p_pickup_lat-23.77308)>0.00001 or abs(p_pickup_lng-90.42447)>0.00001)) then
 raise exception 'The campus endpoint must be BRAC University, Merul Badda.'; end if;
 if p_fare is not null and (p_fare<0 or p_fare>99999999.99 or p_fare<>round(p_fare,2)) then raise exception 'Enter a valid non-negative fare with up to two decimal places.'; end if;
 select * into existing from public.rides where id=p_id;
 if found then
  if existing.owner_id<>member_id then raise exception 'Ride ID is unavailable.'; end if;
  return existing.id;
 end if;
 board:=local_now::date + case when local_now::time>='21:00' then 1 else 0 end;
 if p_date is null or p_time is null or p_date<>board or (p_date+p_time)<=local_now then raise exception 'Choose a future departure on the active ride board.'; end if;
 select display_name into strict member_name from public.profiles where id=member_id;
 insert into public.rides(id,owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats,note,fare,pickup_lat,pickup_lng,destination_lat,destination_lng)
 values(p_id,member_id,member_name,p_direction,btrim(p_pickup),btrim(p_destination),p_date,p_time,p_vehicle,p_seats,p_seats,coalesce(p_note,''),p_fare,p_pickup_lat,p_pickup_lng,p_destination_lat,p_destination_lng);
 return p_id;
end; $$;

create function public.publish_ride_at_locations(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text,p_fare numeric,p_pickup_lat double precision,p_pickup_lng double precision,p_destination_lat double precision,p_destination_lng double precision) returns uuid language sql security invoker set search_path='' as $$ select private.publish_ride_at_locations(p_id,p_direction,p_pickup,p_destination,p_date,p_time,p_vehicle,p_seats,p_note,p_fare,p_pickup_lat,p_pickup_lng,p_destination_lat,p_destination_lng); $$;
revoke all on function private.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function private.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision) to authenticated;
revoke all on function public.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision) to authenticated;
