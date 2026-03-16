
-- Create devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  device_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  ip_address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" ON public.devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own devices" ON public.devices FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own devices" ON public.devices FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create sensor_data table
CREATE TABLE public.sensor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  motion TEXT,
  battery TEXT,
  location TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sensor data" ON public.sensor_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Edge function can insert sensor data" ON public.sensor_data FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert sensor data" ON public.sensor_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  ip_address TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Edge function can insert alerts" ON public.alerts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Users can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true);

-- Create system_logs table
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  device_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs" ON public.system_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Edge function can insert logs" ON public.system_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert logs" ON public.system_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for sensor_data and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
