-- Enforce across all publishing RPCs, including simultaneous requests from different tabs.
create or replace function private.enforce_one_active_ride()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.cancelled and (new.ride_date+new.departure_time)>(now() at time zone 'Asia/Dhaka') then
  -- Serialize publishing for this member before checking their other offers.
  perform 1 from public.profiles where id=new.owner_id for update;
  if exists(select 1 from public.rides r where r.owner_id=new.owner_id and r.direction=new.direction
    and r.id<>new.id and not r.cancelled
    and (r.ride_date+r.departure_time)>(now() at time zone 'Asia/Dhaka')) then
   raise exception 'You already have an active offer in this direction.' using errcode='23505';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.enforce_one_active_ride() from public,anon,authenticated;
drop trigger rides_one_active_per_owner on public.rides;
create trigger rides_one_active_per_owner
before insert or update of owner_id,direction,ride_date,departure_time,cancelled on public.rides
for each row execute function private.enforce_one_active_ride();

create function private.enforce_one_booking_per_direction()
returns trigger language plpgsql security definer set search_path='' as $$
declare target public.rides;
begin
 if new.status not in ('pending','accepted') then return new; end if;
 perform 1 from public.profiles where id=new.requester_id for update;
 select * into strict target from public.rides where id=new.ride_id;
 if target.cancelled or (target.ride_date+target.departure_time)<=(now() at time zone 'Asia/Dhaka') then return new; end if;
 if exists(select 1 from public.ride_requests q join public.rides r on r.id=q.ride_id
  where q.requester_id=new.requester_id and q.id<>new.id and q.status in ('pending','accepted')
  and r.direction=target.direction and not r.cancelled
  and (r.ride_date+r.departure_time)>(now() at time zone 'Asia/Dhaka')) then
  raise exception 'You already have a booking in this direction.' using errcode='23505';
 end if;
 return new;
end; $$;
revoke all on function private.enforce_one_booking_per_direction() from public,anon,authenticated;
create trigger requests_one_active_per_direction
before insert or update of requester_id,ride_id,status on public.ride_requests
for each row execute function private.enforce_one_booking_per_direction();
