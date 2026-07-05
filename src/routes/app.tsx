import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useEffect } from "react";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: () => (
    <AuthProvider>
      <Guard />
    </AuthProvider>
  ),
});

function Guard() {
  const { loading, user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);
  if (loading) return (
    <div className="min-h-screen grid place-items-center text-muted-foreground">
      <div className="eyebrow">Loading console…</div>
    </div>
  );
  if (!user) return null;
  return <AppShell><Outlet /></AppShell>;
}
