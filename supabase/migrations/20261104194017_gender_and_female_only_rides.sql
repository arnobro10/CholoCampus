alter table public.profiles add column gender text
  check (gender in ('female', 'male', 'nonbinary', 'other'));
grant update (gender) on public.profiles to authenticated;

create function private.keep_profile_gender() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.gender is not null and new.gender is distinct from old.gender then
    raise exception 'Gender has already been recorded.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_profile_gender() from public, anon, authenticated;
create trigger keep_profile_gender before update of gender on public.profiles
for each row execute function private.keep_profile_gender();

alter table public.rides add column female_only boolean not null default false;

create function private.enforce_female_ride_eligibility() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  member_id uuid;
  restricted boolean;
begin
  if tg_table_name = 'rides' then
    member_id := new.owner_id;
    restricted := new.female_only;
  else
    member_id := new.requester_id;
    select r.female_only into restricted from public.rides r where r.id = new.ride_id;
  end if;
  if restricted and not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = member_id and p.gender = 'female'
      and lower(split_part(u.email, '@', 2)) = 'g.bracu.ac.bd'
  ) then
    raise exception 'This option is available to female students only.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_female_ride_eligibility() from public, anon, authenticated;
create trigger female_ride_host before insert or update of owner_id, female_only on public.rides
for each row execute function private.enforce_female_ride_eligibility();
create trigger female_ride_passenger before insert or update of requester_id, ride_id on public.ride_requests
for each row execute function private.enforce_female_ride_eligibility();

alter policy rides_members_read on public.rides using (
  (select private.is_university_member()) and (
    not female_only or owner_id = (select auth.uid()) or (
      lower(split_part((select auth.jwt()) ->> 'email', '@', 2)) = 'g.bracu.ac.bd'
      and exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.gender = 'female'
      )
    )
  )
);

create function private.publish_ride_at_locations(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text,p_fare numeric,p_pickup_lat double precision,p_pickup_lng double precision,p_destination_lat double precision,p_destination_lng double precision,p_female_only boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); member_name text; existing public.rides; local_now timestamp:=now() at time zone 'Asia/Dhaka'; board date;
begin
 if not exists (select 1 from public.profiles where id=member_id and gender is not null) then
  raise exception 'Complete your profile before publishing a ride.' using errcode='42501';
 end if;
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
 insert into public.rides(id,owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats,note,fare,pickup_lat,pickup_lng,destination_lat,destination_lng,female_only)
 values(p_id,member_id,member_name,p_direction,btrim(p_pickup),btrim(p_destination),p_date,p_time,p_vehicle,p_seats,p_seats,coalesce(p_note,''),p_fare,p_pickup_lat,p_pickup_lng,p_destination_lat,p_destination_lng,p_female_only);
 return p_id;
end; $$;

create function public.publish_ride_at_locations(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text,p_fare numeric,p_pickup_lat double precision,p_pickup_lng double precision,p_destination_lat double precision,p_destination_lng double precision,p_female_only boolean) returns uuid language sql security invoker set search_path='' as $$ select private.publish_ride_at_locations(p_id,p_direction,p_pickup,p_destination,p_date,p_time,p_vehicle,p_seats,p_note,p_fare,p_pickup_lat,p_pickup_lng,p_destination_lat,p_destination_lng,p_female_only); $$;
revoke all on function private.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision,boolean) from public,anon;
grant execute on function private.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision,boolean) to authenticated;
revoke all on function public.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision,boolean) from public,anon;
grant execute on function public.publish_ride_at_locations(uuid,text,text,text,date,time,text,integer,text,numeric,double precision,double precision,double precision,double precision,boolean) to authenticated;
