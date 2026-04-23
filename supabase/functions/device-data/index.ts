import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const authorizedDevices: Record<string, string> = {
  DEVICE001: "***REMOVED***",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getClientIp = (req: Request) => {
  const xff = req.headers.get("x-forwarded-for") || "";
  return (
    xff.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
};

const isValidTimestamp = (value: unknown) => typeof value === "string" && !isNaN(new Date(value).getTime());

const isValidLocation = (value: unknown): value is { lat: number; lng: number; name: string } => {
  if (!value || typeof value !== "object") return false;
  const location = value as { lat?: unknown; lng?: unknown; name?: unknown };
  return typeof location.lat === "number" && typeof location.lng === "number" && typeof location.name === "string" && location.name.trim().length > 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const ip = getClientIp(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      await supabase.from("system_logs").insert({
        action: "validation_error",
        details: "Validation error: request body must be valid JSON",
        ip_address: ip,
      });

      return new Response(JSON.stringify({ error: "Validation error: request body must be valid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { device_id, api_key, motion, battery, location, timestamp } = body;

    if (typeof device_id !== "string" || typeof api_key !== "string") {
      await supabase.from("system_logs").insert({
        action: "validation_error",
        device_id: typeof device_id === "string" ? device_id : null,
        details: "Validation error: device_id and api_key must be strings",
        ip_address: ip,
      });

      return new Response(JSON.stringify({ error: "Validation error: device_id and api_key must be strings" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedApiKey = authorizedDevices[device_id];
    if (!expectedApiKey || api_key !== expectedApiKey) {
      await supabase.from("alerts").insert({
        device_id,
        alert_type: "unauthorized_access",
        severity: "high",
        ip_address: ip,
      });

      await supabase.from("system_logs").insert({
        action: "unauthorized_access",
        device_id,
        details: !expectedApiKey ? `Unauthorized access: unknown device "${device_id}"` : `Unauthorized access: wrong API key for "${device_id}"`,
        ip_address: ip,
      });

      return new Response(JSON.stringify({ error: "Unauthorized access", device_id }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof motion !== "boolean" || typeof battery !== "number" || !isValidLocation(location) || !isValidTimestamp(timestamp)) {
      await supabase.from("system_logs").insert({
        action: "validation_error",
        device_id,
        details: "Validation error: motion must be boolean, battery must be number, location must include lat/lng/name, and timestamp must be ISO date-time",
        ip_address: ip,
      });

      return new Response(JSON.stringify({ error: "Validation error: invalid sensor payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ts = new Date(timestamp).toISOString();

    await supabase.from("sensor_data").insert({
      device_id,
      motion: String(motion),
      battery: `${battery}%`,
      location: location.name,
      timestamp: ts,
    });

    if (battery < 20) {
      await supabase.from("alerts").insert({
        device_id,
        alert_type: "low_battery",
        severity: "medium",
        ip_address: ip,
      });
    }

    await supabase.from("system_logs").insert({
      action: "data_received",
      device_id,
      details: `Authorized data received from ${device_id}: motion=${motion}, battery=${battery}%, location=${location.name}`,
      ip_address: ip,
    });

    return new Response(JSON.stringify({ success: true, device_id, timestamp: ts }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
