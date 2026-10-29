-- Optional BDT fare per passenger seat. NULL means discuss; zero means free.
alter table public.rides add column fare numeric(10,2) check(fare>=0 and fare<=99999999.99);
comment on column public.rides.fare is 'BDT per seat; NULL means discuss with owner, zero means free.';
create function private.publish_ride(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text,p_fare numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare member_id uuid:=private.require_member(); member_name text; existing public.rides; local_now timestamp:=now() at time zone 'Asia/Dhaka'; board date;
begin
 if p_fare is not null and (p_fare<0 or p_fare>99999999.99 or p_fare<>round(p_fare,2)) then raise exception 'Enter a valid non-negative fare with up to two decimal places.'; end if;
 select * into existing from public.rides where id=p_id;
 if found then
  if existing.owner_id<>member_id then raise exception 'Ride ID is unavailable.'; end if;
  return existing.id;
 end if;
 board:=local_now::date + case when local_now::time>='21:00' then 1 else 0 end;
 if p_date is null or p_time is null or p_date<>board or (p_date+p_time)<=local_now then raise exception 'Choose a future departure on the active ride board.'; end if;
 select display_name into strict member_name from public.profiles where id=member_id;
 insert into public.rides(id,owner_id,owner_name,direction,pickup,destination,ride_date,departure_time,vehicle,capacity,seats,note,fare)
 values(p_id,member_id,member_name,p_direction,btrim(p_pickup),btrim(p_destination),p_date,p_time,p_vehicle,p_seats,p_seats,coalesce(p_note,''),p_fare);
 return p_id;
end; $$;

create function public.publish_ride(p_id uuid,p_direction text,p_pickup text,p_destination text,p_date date,p_time time,p_vehicle text,p_seats integer,p_note text,p_fare numeric) returns uuid language sql security invoker set search_path='' as $$ select private.publish_ride(p_id,p_direction,p_pickup,p_destination,p_date,p_time,p_vehicle,p_seats,p_note,p_fare); $$;
revoke all on function private.publish_ride(uuid,text,text,text,date,time,text,integer,text,numeric) from public,anon;
grant execute on function private.publish_ride(uuid,text,text,text,date,time,text,integer,text,numeric) to authenticated;
revoke all on function public.publish_ride(uuid,text,text,text,date,time,text,integer,text,numeric) from public,anon;
grant execute on function public.publish_ride(uuid,text,text,text,date,time,text,integer,text,numeric) to authenticated;
