import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Alert {
  id: string;
  device_id: string;
  alert_type: string;
  severity: string;
  ip_address: string | null;
  resolved: boolean;
  created_at: string;
}

const severityColor: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchAlerts = async () => {
    const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100);
    setAlerts((data as Alert[]) ?? []);
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, (payload) => {
        setAlerts((prev) => [payload.new as Alert, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-foreground">Security Alerts</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-display text-destructive">{alerts.filter(a => !a.resolved).length} ACTIVE</span>
        </div>
      </div>

      <div className="stat-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground font-display">Alert ID</TableHead>
              <TableHead className="text-muted-foreground font-display">Device ID</TableHead>
              <TableHead className="text-muted-foreground font-display">Type</TableHead>
              <TableHead className="text-muted-foreground font-display">Severity</TableHead>
              <TableHead className="text-muted-foreground font-display">IP Address</TableHead>
              <TableHead className="text-muted-foreground font-display">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No alerts</TableCell></TableRow>
            )}
            {alerts.map((a) => (
              <TableRow key={a.id} className="border-border">
                <TableCell className="font-display text-xs text-muted-foreground">{a.id.slice(0, 8)}</TableCell>
                <TableCell className="font-display text-sm text-primary">{a.device_id}</TableCell>
                <TableCell className="text-secondary-foreground text-sm">{a.alert_type}</TableCell>
                <TableCell>
                  <Badge className={severityColor[a.severity] || severityColor.medium}>{a.severity}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-display">{a.ip_address || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Alerts;
