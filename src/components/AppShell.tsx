import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type Role } from "@/lib/auth";
import { Bell, MessageSquare, LogOut, LayoutDashboard, Radio, ListMusic, Users, History, Inbox, LineChart, FileText, ClipboardCheck, ChevronRight } from "lucide-react";
import logo from "@/assets/vordenk-logo.png.asset.json";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<Role, NavItem[]> = {
  tester: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/record",    label: "Record Vehicle", icon: Radio },
    { to: "/app/recordings",label: "My Recordings", icon: ListMusic },
    { to: "/app/team",      label: "Team", icon: Users },
    { to: "/app/history",   label: "Vehicle History", icon: History },
  ],
  analyzer: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/queue",     label: "Incoming Queue", icon: Inbox },
    { to: "/app/workspace", label: "Analysis Workspace", icon: LineChart },
    { to: "/app/report",    label: "Report Builder", icon: FileText },
    { to: "/app/team",      label: "Team", icon: Users },
    { to: "/app/history",   label: "Vehicle History", icon: History },
  ],
  integrator: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/reports",   label: "Incoming Reports", icon: Inbox },
    { to: "/app/review",    label: "Report Review", icon: FileText },
    { to: "/app/field",     label: "Field Check", icon: ClipboardCheck },
    { to: "/app/team",      label: "Team", icon: Users },
    { to: "/app/history",   label: "Vehicle History", icon: History },
  ],
  admin: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/history",   label: "Vehicle History", icon: History },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = role ? NAV[role] : [];
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    supabase.from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", profile.id).eq("read", false)
      .then(({ count }) => setNotifCount(count ?? 0));
  }, [profile, pathname]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="px-6 pt-7 pb-6 border-b border-sidebar-border">
          <img src={logo.url} alt="Vordenk" className="h-10 w-auto object-contain" />
          <div className="eyebrow mt-3 text-[10px]">Think Ahead · Prevent Downtime</div>
        </div>
        <nav className="flex-1 py-4">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`group flex items-center gap-3 px-6 py-2.5 text-[15px] transition-colors ${
                  active
                    ? "text-sidebar-primary-foreground bg-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-4 w-4 opacity-80" />
                <span>{it.label}</span>
                {active && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-[14px] font-bold">
              {profile?.name.split(" ").map(s=>s[0]).slice(0,2).join("") ?? "—"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-sidebar-foreground truncate">{profile?.name ?? "…"}</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{role}</div>
            </div>
            <button
              onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
              title="Sign out"
              className="p-2 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Vordenk · Fleet Diagnostics Console
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/messages" className="relative p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-5 w-5" />
            </Link>
            <button className="relative p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1 grid place-items-center">
                  {notifCount}
                </span>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
