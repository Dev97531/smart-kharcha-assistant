
REVOKE EXECUTE ON FUNCTION public.is_committee_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_committee_organizer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_committee_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_committee_organizer(uuid, uuid) TO authenticated, service_role;
