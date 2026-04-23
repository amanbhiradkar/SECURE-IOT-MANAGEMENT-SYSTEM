ALTER TABLE public.sensor_data
ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can view their own sensor data" ON public.sensor_data;

CREATE POLICY "Authenticated users can view live sensor data"
ON public.sensor_data
FOR SELECT
TO authenticated
USING (true);