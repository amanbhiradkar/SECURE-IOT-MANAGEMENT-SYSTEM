
-- Remove overly permissive anon INSERT policies (edge function uses service_role which bypasses RLS)
DROP POLICY "Edge function can insert sensor data" ON public.sensor_data;
DROP POLICY "Edge function can insert alerts" ON public.alerts;
DROP POLICY "Edge function can insert logs" ON public.system_logs;

-- Remove overly permissive UPDATE on alerts  
DROP POLICY "Users can update alerts" ON public.alerts;

-- Replace with proper authenticated policies
CREATE POLICY "Authenticated can update own alerts" ON public.alerts FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Remove overly permissive authenticated insert on system_logs
DROP POLICY "Authenticated can insert logs" ON public.system_logs;
CREATE POLICY "Authenticated can insert own logs" ON public.system_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
