-- Enforce across all publishing RPCs, including simultaneous requests from different tabs.
create function private.enforce_one_active_ride()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.cancelled and (new.ride_date+new.departure_time)>(now() at time zone 'Asia/Dhaka') then
  -- Serialize publishing for this member before checking their other offers.
  perform 1 from public.profiles where id=new.owner_id for update;
  if exists(select 1 from public.rides r where r.owner_id=new.owner_id
    and r.id<>new.id and not r.cancelled
    and (r.ride_date+r.departure_time)>(now() at time zone 'Asia/Dhaka')) then
   raise exception 'You already have an active ride offer. Cancel it in My rides before publishing another.' using errcode='23505';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.enforce_one_active_ride() from public,anon,authenticated;
create trigger rides_one_active_per_owner
before insert or update of owner_id,ride_date,departure_time,cancelled on public.rides
for each row execute function private.enforce_one_active_ride();
