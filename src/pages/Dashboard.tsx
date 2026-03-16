import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Cpu, Activity, AlertTriangle, Database, Wifi } from "lucide-react";

interface Stats {
  totalDevices: number;
  activeDevices: number;
  alerts: number;
  sensorEntries: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalDevices: 0, activeDevices: 0, alerts: 0, sensorEntries: 0 });

  const fetchStats = async () => {
    const [devices, activeDevices, alerts, sensor] = await Promise.all([
      supabase.from("devices").select("*", { count: "exact", head: true }),
      supabase.from("devices").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("alerts").select("*", { count: "exact", head: true }).eq("resolved", false),
      supabase.from("sensor_data").select("*", { count: "exact", head: true }),
    ]);
    setStats({
      totalDevices: devices.count ?? 0,
      activeDevices: activeDevices.count ?? 0,
      alerts: alerts.count ?? 0,
      sensorEntries: sensor.count ?? 0,
    });
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { label: "Total Devices", value: stats.totalDevices, icon: Cpu, color: "text-primary" },
    { label: "Active Devices", value: stats.activeDevices, icon: Activity, color: "text-accent" },
    { label: "Active Alerts", value: stats.alerts, icon: AlertTriangle, color: "text-destructive" },
    { label: "Sensor Entries", value: stats.sensorEntries, icon: Database, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground font-display">Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
          <Wifi className="h-4 w-4 text-primary" />
          <span className="text-xs font-display text-primary">MONITORING ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <span className="text-xs text-muted-foreground font-display uppercase">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground font-display">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="stat-card">
        <h2 className="text-sm font-display text-muted-foreground uppercase tracking-wider mb-4">System Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["API Gateway", "Database", "Auth Service", "Realtime"].map((service) => (
            <div key={service} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm text-secondary-foreground">{service}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stat-card">
        <h2 className="text-sm font-display text-muted-foreground uppercase tracking-wider mb-3">API Endpoint</h2>
        <code className="text-sm text-primary bg-muted px-3 py-2 rounded block font-display">
          POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/device-data
        </code>
        <p className="text-xs text-muted-foreground mt-2">Send IoT sensor data to this endpoint from your devices.</p>
      </div>
    </div>
  );
};

export default Dashboard;
