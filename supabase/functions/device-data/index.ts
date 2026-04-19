import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json();
    const { device_id, motion, battery, location, timestamp } = body;

    if (!device_id) {
      return new Response(JSON.stringify({ error: "device_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the original client IP (first entry in x-forwarded-for chain)
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip =
      xff.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Check if device exists in registry
    const { data: device } = await supabase
      .from("devices")
      .select("*")
      .eq("device_id", device_id)
      .single();

    if (!device) {
      // Unauthorized device - create alert and log
      await supabase.from("alerts").insert({
        device_id,
        alert_type: "unauthorized_access",
        severity: "high",
        ip_address: ip,
      });

      await supabase.from("system_logs").insert({
        action: "unauthorized_access",
        device_id,
        details: `Unauthorized device "${device_id}" attempted connection`,
        ip_address: ip,
      });

      return new Response(JSON.stringify({ error: "Unauthorized device", device_id }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (device.status === "blocked") {
      await supabase.from("alerts").insert({
        device_id,
        alert_type: "blocked_device_attempt",
        severity: "medium",
        ip_address: ip,
      });

      await supabase.from("system_logs").insert({
        action: "blocked_device_attempt",
        device_id,
        details: `Blocked device "${device_id}" attempted connection`,
        ip_address: ip,
      });

      return new Response(JSON.stringify({ error: "Device is blocked", device_id }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Device is valid and active - store sensor data
    // Use the device's real timestamp if provided; only fall back to server time if missing/"auto"
    let ts: string;
    if (!timestamp || timestamp === "auto") {
      ts = new Date().toISOString();
    } else {
      const parsed = new Date(timestamp);
      ts = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }

    await supabase.from("sensor_data").insert({
      device_id,
      motion: motion || null,
      battery: battery || null,
      location: location || null,
      timestamp: ts,
      user_id: device.user_id,
    });

    await supabase.from("system_logs").insert({
      action: "sensor_data_received",
      device_id,
      details: `Sensor data received: motion=${motion}, battery=${battery}`,
      ip_address: ip,
      user_id: device.user_id,
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
