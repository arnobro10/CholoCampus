alter policy rides_members_read on public.rides using ((select private.is_university_member()));
