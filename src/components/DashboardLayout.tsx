import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border bg-card/50 px-4">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs text-muted-foreground font-display">SYSTEM ONLINE</span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
