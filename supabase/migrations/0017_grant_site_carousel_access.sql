begin;

grant select on table public.site_carousel_slides to anon, authenticated;
grant select, insert, update, delete on table public.site_carousel_slides to service_role;

commit;
