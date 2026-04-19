import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xff = req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const deviceLabel = `LOGIN:${email}`;

    // Log the failed attempt
    await supabase.from("system_logs").insert({
      action: "failed_login",
      device_id: deviceLabel,
      details: `Failed login attempt for ${email}`,
      ip_address: ip,
    });

    // Count failed attempts in last 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("system_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "failed_login")
      .eq("device_id", deviceLabel)
      .gte("created_at", since);

    const attempts = count ?? 0;
    let bruteForce = false;

    if (attempts >= 3) {
      bruteForce = true;
      // Avoid duplicate alerts within the same 10-min window
      const { count: existingAlerts } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("alert_type", "brute_force_attempt")
        .eq("device_id", deviceLabel)
        .gte("created_at", since);

      if ((existingAlerts ?? 0) === 0) {
        await supabase.from("alerts").insert({
          device_id: deviceLabel,
          alert_type: "brute_force_attempt",
          severity: "high",
          ip_address: ip,
        });
        await supabase.from("system_logs").insert({
          action: "brute_force_attempt",
          device_id: deviceLabel,
          details: `Brute force attack detected: ${attempts} failed login attempts for ${email}`,
          ip_address: ip,
        });
      }
    }

    return new Response(JSON.stringify({ attempts, bruteForce }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
