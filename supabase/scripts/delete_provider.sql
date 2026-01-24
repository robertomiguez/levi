-- Variable: provider_id_to_delete
-- Set the provider_id you want to delete below
-- Run this script in the Supabase SQL Editor

DO $$
DECLARE
    -- REPLACE THIS UUID WITH THE PROVIDER ID YOU WANT TO DELETE
    target_provider_id uuid := '00000000-0000-0000-0000-000000000000'; 
BEGIN
    RAISE NOTICE 'Starting deletion for provider: %', target_provider_id;

    -- 1. Delete Service Staff links (join table between services and staff)
    -- Dependencies: Service, Staff
    DELETE FROM public.service_staff
    WHERE service_id IN (SELECT id FROM public.services WHERE provider_id = target_provider_id);
    RAISE NOTICE 'Deleted service_staff';

    -- 2. Delete Staff Addresses
    -- Dependencies: Staff
    DELETE FROM public.staff_addresses
    WHERE staff_id IN (SELECT id FROM public.staff WHERE provider_id = target_provider_id);
    RAISE NOTICE 'Deleted staff_addresses';

    -- 3. Delete Appointments
    -- Dependencies: Service, Staff, Customer
    -- Deleting appointments linked to the provider's services
    DELETE FROM public.appointments
    WHERE service_id IN (SELECT id FROM public.services WHERE provider_id = target_provider_id);
    RAISE NOTICE 'Deleted appointments';

    -- 4. Delete Availability
    -- Dependencies: Provider (optional), Staff
    -- We delete availability linked explicitly to provider OR to staff of the provider
    DELETE FROM public.availability
    WHERE provider_id = target_provider_id
       OR staff_id IN (SELECT id FROM public.staff WHERE provider_id = target_provider_id);
    RAISE NOTICE 'Deleted availability';

    -- 5. Delete Blocked Dates
    -- Dependencies: Provider (optional), Staff
    DELETE FROM public.blocked_dates
    WHERE provider_id = target_provider_id
       OR staff_id IN (SELECT id FROM public.staff WHERE provider_id = target_provider_id);
    RAISE NOTICE 'Deleted blocked_dates';

    -- 6. Delete Services
    -- Dependencies: Provider
    DELETE FROM public.services
    WHERE provider_id = target_provider_id;
    RAISE NOTICE 'Deleted services';

    -- 7. Delete Staff
    -- Dependencies: Provider
    DELETE FROM public.staff
    WHERE provider_id = target_provider_id;
    RAISE NOTICE 'Deleted staff';

    -- 8. Delete Provider Addresses
    -- Dependencies: Provider
    DELETE FROM public.provider_addresses
    WHERE provider_id = target_provider_id;
    RAISE NOTICE 'Deleted provider_addresses';

    -- 9. Delete Provider
    -- Root
    DELETE FROM public.providers
    WHERE id = target_provider_id;
    RAISE NOTICE 'Deleted provider: %', target_provider_id;

END $$;
