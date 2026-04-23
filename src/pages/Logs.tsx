import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  device_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

const actionColor: Record<string, string> = {
  data_received: "text-accent",
  device_registered: "text-primary",
  device_removed: "text-warning",
  sensor_data_received: "text-accent",
  unauthorized_access: "text-destructive",
  blocked_device_attempt: "text-destructive",
  validation_error: "text-warning",
};

const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(200);
      setLogs((data as LogEntry[]) ?? []);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold font-display text-foreground">System Logs</h1>
      </div>

      <div className="stat-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground font-display">Time</TableHead>
              <TableHead className="text-muted-foreground font-display">Action</TableHead>
              <TableHead className="text-muted-foreground font-display">Device</TableHead>
              <TableHead className="text-muted-foreground font-display">Details</TableHead>
              <TableHead className="text-muted-foreground font-display">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No logs</TableCell></TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id} className="border-border">
                <TableCell className="text-muted-foreground text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell className={`font-display text-sm ${actionColor[log.action] || "text-secondary-foreground"}`}>{log.action}</TableCell>
                <TableCell className="font-display text-sm text-primary">{log.device_id || "—"}</TableCell>
                <TableCell className="text-secondary-foreground text-sm max-w-xs truncate">{log.details || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-display">{log.ip_address || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Logs;
