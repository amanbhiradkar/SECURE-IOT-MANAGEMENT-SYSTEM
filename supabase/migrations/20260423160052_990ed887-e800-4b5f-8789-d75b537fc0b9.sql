UPDATE public.sensor_data
SET timestamp = now()
WHERE timestamp > now() + interval '5 minutes';