CREATE OR REPLACE FUNCTION public.user_owns_provider(provider_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = provider_uuid
    AND auth_user_id::text = auth.uid()::text
  );
END;
$function$
;

-- Enable RLS on tables
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blocked_dates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
drop policy if exists "Allow public read access" on "public"."appointments";
drop policy if exists "Allow auth users to insert own appointments" on "public"."appointments";
drop policy if exists "Allow auth users to update own appointments" on "public"."appointments";
DROP POLICY IF EXISTS "Availability is viewable by everyone" ON public.availability;
DROP POLICY IF EXISTS "Providers can insert their own availability" ON public.availability;
DROP POLICY IF EXISTS "Providers can update their own availability" ON public.availability;
DROP POLICY IF EXISTS "Providers can delete their own availability" ON public.availability;
DROP POLICY IF EXISTS "Blocked dates are viewable by everyone" ON public.blocked_dates;
DROP POLICY IF EXISTS "Providers can insert their own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Providers can update their own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Providers can delete their own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.customers;
DROP POLICY IF EXISTS "Providers can delete their own addresses" ON public.provider_addresses;
DROP POLICY IF EXISTS "Providers can insert their own addresses" ON public.provider_addresses;
DROP POLICY IF EXISTS "Providers can update their own addresses" ON public.provider_addresses;
DROP POLICY IF EXISTS "Providers can view their own addresses" ON public.provider_addresses;
DROP POLICY IF EXISTS "Public can view approved provider addresses" ON public.provider_addresses;
DROP POLICY IF EXISTS "Public providers are viewable by everyone" ON public.providers;
DROP POLICY IF EXISTS "Users can insert their own provider profile" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own provider profile" ON public.providers;
DROP POLICY IF EXISTS "Users can delete their own provider profile" ON public.providers;
DROP POLICY IF EXISTS "Public services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "Providers can insert their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can update their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can delete their own services" ON public.services;
DROP POLICY IF EXISTS "Active staff are viewable by everyone" ON public.staff;
DROP POLICY IF EXISTS "Providers can delete their own staff" ON public.staff;
DROP POLICY IF EXISTS "Providers can insert their own staff" ON public.staff;
DROP POLICY IF EXISTS "Providers can select their own staff" ON public.staff;
DROP POLICY IF EXISTS "Providers can update their own staff" ON public.staff;
DROP POLICY IF EXISTS "Public can view service_staff" ON public.service_staff;
DROP POLICY IF EXISTS "Providers can manage their service_staff" ON public.service_staff;
DROP POLICY IF EXISTS "Public can view staff_addresses" ON public.staff_addresses;
DROP POLICY IF EXISTS "Providers can manage staff_addresses" ON public.staff_addresses;

-- Appointments
create policy "Allow public read access" on "public"."appointments" for select using (true);
create policy "Allow auth users to insert own appointments"
on "public"."appointments"
for insert
with check (
  exists (
    select 1 from public.customers
    where customers.id = appointments.customer_id
    and customers.auth_user_id::text = auth.uid()::text
  )
);
create policy "Allow auth users to update own appointments"
on "public"."appointments"
for update
using (
  exists (
    select 1 from public.customers
    where customers.id = appointments.customer_id
    and customers.auth_user_id::text = auth.uid()::text
  )
);

-- Availability & Blocked Dates & Categories
CREATE POLICY "Availability is viewable by everyone" ON public.availability FOR SELECT TO public USING (true);
CREATE POLICY "Providers can insert their own availability" ON public.availability FOR INSERT TO authenticated WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can update their own availability" ON public.availability FOR UPDATE TO authenticated USING (user_owns_provider(provider_id)) WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can delete their own availability" ON public.availability FOR DELETE TO authenticated USING (user_owns_provider(provider_id));
CREATE POLICY "Blocked dates are viewable by everyone" ON public.blocked_dates FOR SELECT TO public USING (true);
CREATE POLICY "Providers can insert their own blocked dates" ON public.blocked_dates FOR INSERT TO authenticated WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can update their own blocked dates" ON public.blocked_dates FOR UPDATE TO authenticated USING (user_owns_provider(provider_id)) WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can delete their own blocked dates" ON public.blocked_dates FOR DELETE TO authenticated USING (user_owns_provider(provider_id));
CREATE POLICY "Public categories are viewable by everyone" ON public.categories FOR SELECT TO public USING (true);

-- Customers
CREATE POLICY "Users can insert their own profile" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = auth_user_id::text);
CREATE POLICY "Users can update their own profile" ON public.customers FOR UPDATE TO authenticated USING (auth.uid()::text = auth_user_id::text);
CREATE POLICY "Users can view their own profile" ON public.customers FOR SELECT TO authenticated USING (auth.uid()::text = auth_user_id::text);

-- Provider Addresses
CREATE POLICY "Providers can delete their own addresses" ON public.provider_addresses FOR DELETE TO authenticated USING (
  provider_id IN (SELECT providers.id FROM providers WHERE providers.auth_user_id::text = auth.uid()::text)
);
CREATE POLICY "Providers can insert their own addresses" ON public.provider_addresses FOR INSERT TO authenticated WITH CHECK (
  provider_id IN (SELECT providers.id FROM providers WHERE providers.auth_user_id::text = auth.uid()::text)
);
CREATE POLICY "Providers can update their own addresses" ON public.provider_addresses FOR UPDATE TO authenticated USING (
  provider_id IN (SELECT providers.id FROM providers WHERE providers.auth_user_id::text = auth.uid()::text)
) WITH CHECK (
  provider_id IN (SELECT providers.id FROM providers WHERE providers.auth_user_id::text = auth.uid()::text)
);
CREATE POLICY "Providers can view their own addresses" ON public.provider_addresses FOR SELECT TO authenticated USING (
  provider_id IN (SELECT providers.id FROM providers WHERE providers.auth_user_id::text = auth.uid()::text)
);
CREATE POLICY "Public can view approved provider addresses" ON public.provider_addresses FOR SELECT TO public USING (true);

-- Providers
CREATE POLICY "Public providers are viewable by everyone" ON public.providers FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert their own provider profile" ON public.providers FOR INSERT TO authenticated WITH CHECK (
  auth.uid()::text = auth_user_id::text
);
CREATE POLICY "Users can update their own provider profile" ON public.providers FOR UPDATE TO authenticated USING (
  auth.uid()::text = auth_user_id::text
) WITH CHECK (
  auth.uid()::text = auth_user_id::text
);
CREATE POLICY "Users can delete their own provider profile" ON public.providers FOR DELETE TO authenticated USING (
  auth.uid()::text = auth_user_id::text
);

-- Services
CREATE POLICY "Public services are viewable by everyone" ON public.services FOR SELECT TO public USING (true);
CREATE POLICY "Providers can insert their own services" ON public.services FOR INSERT TO authenticated WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can update their own services" ON public.services FOR UPDATE TO authenticated USING (user_owns_provider(provider_id)) WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can delete their own services" ON public.services FOR DELETE TO authenticated USING (user_owns_provider(provider_id));

-- Staff
CREATE POLICY "Active staff are viewable by everyone" ON public.staff FOR SELECT TO public USING (active = true);
CREATE POLICY "Providers can delete their own staff" ON public.staff FOR DELETE TO authenticated USING (user_owns_provider(provider_id));
CREATE POLICY "Providers can insert their own staff" ON public.staff FOR INSERT TO authenticated WITH CHECK (user_owns_provider(provider_id));
CREATE POLICY "Providers can select their own staff" ON public.staff FOR SELECT TO authenticated USING (user_owns_provider(provider_id));
CREATE POLICY "Providers can update their own staff" ON public.staff FOR UPDATE TO authenticated USING (user_owns_provider(provider_id)) WITH CHECK (user_owns_provider(provider_id));
      

-- service_staff
CREATE POLICY "Public can view service_staff" 
ON public.service_staff FOR SELECT 
USING (true);
CREATE POLICY "Providers can manage their service_staff" 
ON public.service_staff FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.services s
        JOIN public.providers p ON s.provider_id = p.id
        WHERE s.id = service_staff.service_id
        AND p.auth_user_id = auth.uid()
    )
);

-- staff_addresses
CREATE POLICY "Public can view staff_addresses" 
ON public.staff_addresses FOR SELECT 
USING (true);

CREATE POLICY "Providers can manage staff_addresses" 
ON public.staff_addresses FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.staff s
        WHERE s.id = staff_addresses.staff_id
        AND user_owns_provider(s.provider_id)
    )
);

-- Storage: provider-logos
-- Note: These policies depend on the storage schema which might not be fully represented here, but added for reference.
-- Check migration file for full bucket creation details.

-- Policy: Public can view any logo
DROP POLICY IF EXISTS "Public Access Logo" ON "storage"."objects";
CREATE POLICY "Public Access Logo" ON "storage"."objects" FOR SELECT TO public USING ( bucket_id = 'provider-logos' );

-- Policy: Providers can upload their own logo (enforced by folder structure {uid}/*)
DROP POLICY IF EXISTS "Provider Upload Logo" ON "storage"."objects";
CREATE POLICY "Provider Upload Logo" ON "storage"."objects" FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'provider-logos' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Policy: Providers can update their own logo
DROP POLICY IF EXISTS "Provider Update Logo" ON "storage"."objects";
CREATE POLICY "Provider Update Logo" ON "storage"."objects" FOR UPDATE TO authenticated USING ( bucket_id = 'provider-logos' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Policy: Providers can delete their own logo
DROP POLICY IF EXISTS "Provider Delete Logo" ON "storage"."objects";
CREATE POLICY "Provider Delete Logo" ON "storage"."objects" FOR DELETE TO authenticated USING ( bucket_id = 'provider-logos' AND (storage.foldername(name))[1] = auth.uid()::text );
