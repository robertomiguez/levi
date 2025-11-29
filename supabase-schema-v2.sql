-- Enhanced Supabase Database Schema with Customer Entity and Auth

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers Table (linked to Supabase Auth)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auth_user_id)
);

-- Services Table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
  price NUMERIC(10, 2) DEFAULT NULL,
  buffer_before INTEGER DEFAULT 0 CHECK (buffer_before >= 0), -- in minutes
  buffer_after INTEGER DEFAULT 0 CHECK (buffer_after >= 0), -- in minutes
  category TEXT DEFAULT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Table
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability Table (recurring weekly schedule)
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  UNIQUE(staff_id, day_of_week, start_time, end_time)
);

-- Blocked Dates Table (vacations, holidays, etc.)
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT DEFAULT NULL,
  CHECK (end_date >= start_date)
);

-- Appointments Table (now references customers)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'no-show')),
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX idx_customers_auth_user ON customers(auth_user_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_availability_staff ON availability(staff_id);
CREATE INDEX idx_blocked_dates_staff ON blocked_dates(staff_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create customer profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (auth_user_id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create customer on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Customers: Users can read and update their own profile
CREATE POLICY "Users can view their own profile" ON customers
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON customers
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Services: Everyone can read
CREATE POLICY "Services are viewable by everyone" ON services
  FOR SELECT USING (active = true);

-- Staff: Everyone can read active staff
CREATE POLICY "Active staff are viewable by everyone" ON staff
  FOR SELECT USING (active = true);

-- Availability: Everyone can read
CREATE POLICY "Availability is viewable by everyone" ON availability
  FOR SELECT USING (true);

-- Blocked dates: Everyone can read
CREATE POLICY "Blocked dates are viewable by everyone" ON blocked_dates
  FOR SELECT USING (true);

-- Appointments: Users can view their own appointments
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = appointments.customer_id
      AND customers.auth_user_id = auth.uid()
    )
  );

-- Appointments: Authenticated users can create appointments
CREATE POLICY "Authenticated users can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_id
      AND customers.auth_user_id = auth.uid()
    )
  );

-- Appointments: Users can update their own appointments
CREATE POLICY "Users can update their own appointments" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = appointments.customer_id
      AND customers.auth_user_id = auth.uid()
    )
  );

-- Insert sample data
INSERT INTO staff (name, email, role) VALUES
  ('Admin User', 'admin@example.com', 'admin'),
  ('Staff Member', 'staff@example.com', 'staff');

INSERT INTO services (name, duration, price, buffer_before, buffer_after, category) VALUES
  ('Haircut', 30, 50.00, 5, 5, 'Hair'),
  ('Hair Coloring', 60, 120.00, 10, 10, 'Hair'),
  ('Massage (60 min)', 60, 90.00, 0, 15, 'Spa'),
  ('Massage (30 min)', 30, 55.00, 0, 10, 'Spa');

-- Add sample availability (Monday-Friday, 9 AM - 5 PM)
INSERT INTO availability (staff_id, day_of_week, start_time, end_time)
SELECT 
  s.id,
  day_num,
  '09:00:00'::TIME,
  '17:00:00'::TIME
FROM staff s
CROSS JOIN generate_series(1, 5) AS day_num; -- 1=Monday to 5=Friday
