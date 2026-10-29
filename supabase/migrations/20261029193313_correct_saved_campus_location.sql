-- Correct only the old exact BRACU campus pin; preserve user-defined locations and daily counters.
update public.preferred_destinations set lat=23.77308,lng=90.42447,updated_at=now()
where name='BRAC University, Merul Badda' and abs(lat-23.7808)<0.00001 and abs(lng-90.4254)<0.00001;
