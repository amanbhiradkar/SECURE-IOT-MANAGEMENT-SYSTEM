import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";

interface SensorEntry {
  id: string;
  device_id: string;
  motion: string | null;
  battery: string | null;
  location: string | null;
  timestamp: string;
}

const LiveData = () => {
  const [data, setData] = useState<SensorEntry[]>([]);

  const fetchData = async () => {
    const { data: rows } = await supabase
      .from("sensor_data")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);
    setData((rows as SensorEntry[]) ?? []);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("sensor-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_data" }, (payload) => {
        setData((prev) => [payload.new as SensorEntry, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-foreground">Live Sensor Data</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20">
          <Radio className="h-4 w-4 text-accent animate-pulse-glow" />
          <span className="text-xs font-display text-accent">LIVE FEED</span>
        </div>
      </div>

      <div className="stat-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground font-display">Device ID</TableHead>
              <TableHead className="text-muted-foreground font-display">Motion</TableHead>
              <TableHead className="text-muted-foreground font-display">Battery</TableHead>
              <TableHead className="text-muted-foreground font-display">Location</TableHead>
              <TableHead className="text-muted-foreground font-display">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sensor data received yet</TableCell></TableRow>
            )}
            {data.map((entry) => (
              <TableRow key={entry.id} className="border-border">
                <TableCell className="font-display text-sm text-primary">{entry.device_id}</TableCell>
                <TableCell>
                  <Badge variant={entry.motion === "detected" ? "destructive" : "secondary"} className={entry.motion === "detected" ? "" : "bg-muted text-muted-foreground"}>
                    {entry.motion || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-secondary-foreground font-display text-sm">{entry.battery || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-display">{entry.location || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(entry.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LiveData;
