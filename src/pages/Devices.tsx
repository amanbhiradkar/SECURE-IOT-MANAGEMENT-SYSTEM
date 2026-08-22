import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  device_hash: string | null;
  status: string;
  ip_address: string | null;
  created_at: string;
}

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ device_id: "DEVICE001", device_name: "Demo Sensor", api_key: "", ip_address: "" });

  const fetchDevices = async () => {
    const { data } = await supabase.from("devices").select("*").order("created_at", { ascending: false });
    setDevices((data as Device[]) ?? []);
  };

  useEffect(() => { fetchDevices(); }, []);

  const addDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("devices").insert({
      device_id: form.device_id,
      device_name: form.device_name,
      device_hash: form.api_key,
      ip_address: form.ip_address || null,
      user_id: user.id,
    });
    if (error) { toast.error(error.message); return; }

    await supabase.from("system_logs").insert({
      action: "device_registered",
      device_id: form.device_id,
      details: `Device "${form.device_name}" registered`,
      user_id: user.id,
    });

    toast.success("Device registered");
    setForm({ device_id: "DEVICE001", device_name: "Demo Sensor", api_key: "", ip_address: "" });
    setOpen(false);
    fetchDevices();
  };

  const toggleStatus = async (device: Device) => {
    const newStatus = device.status === "active" ? "blocked" : "active";
    await supabase.from("devices").update({ status: newStatus }).eq("id", device.id);
    toast.success(`Device ${newStatus}`);
    fetchDevices();
  };

  const deleteDevice = async (device: Device) => {
    await supabase.from("devices").delete().eq("id", device.id);
    if (user) {
      await supabase.from("system_logs").insert({
        action: "device_removed",
        device_id: device.device_id,
        details: `Device "${device.device_name}" removed`,
        user_id: user.id,
      });
    }
    toast.success("Device deleted");
    fetchDevices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-foreground">Devices</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Register Device</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Register New Device</DialogTitle>
            </DialogHeader>
            <form onSubmit={addDevice} className="space-y-4">
              <div><Label>Device ID</Label><Input value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })} placeholder="SENSOR-001" required className="bg-muted" /></div>
              <div><Label>Device Name</Label><Input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} placeholder="Living Room Sensor" required className="bg-muted" /></div>
              <div><Label>API Key</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Enter device API key" required className="bg-muted" /></div>
              <div><Label>IP Address</Label><Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.100" className="bg-muted" /></div>
              <Button type="submit" className="w-full">Register</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="stat-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground font-display">Device ID</TableHead>
              <TableHead className="text-muted-foreground font-display">Name</TableHead>
              <TableHead className="text-muted-foreground font-display">Status</TableHead>
              <TableHead className="text-muted-foreground font-display">IP Address</TableHead>
              <TableHead className="text-muted-foreground font-display">Created</TableHead>
              <TableHead className="text-muted-foreground font-display">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No devices registered</TableCell></TableRow>
            )}
            {devices.map((d) => (
              <TableRow key={d.id} className="border-border">
                <TableCell className="font-display text-sm text-primary">{d.device_id}</TableCell>
                <TableCell className="text-secondary-foreground">{d.device_name}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "active" ? "default" : "destructive"} className={d.status === "active" ? "bg-primary/20 text-primary border-primary/30" : ""}>
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground font-display text-xs">{d.ip_address || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(d)} title={d.status === "active" ? "Block" : "Activate"}>
                      {d.status === "active" ? <Ban className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDevice(d)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Devices;
