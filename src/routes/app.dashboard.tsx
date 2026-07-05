import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatCard, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

type Activity = { kind: string; label: string; when: string; vehicle: string };

function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState({ a: 0, b: 0, c: 0 });
  const [feed, setFeed] = useState<Activity[]>([]);

  useEffect(() => {
    if (!profile || !role) return;
    (async () => {
      if (role === "tester") {
        const [{ count: total }, { count: sent }, { count: pend }] = await Promise.all([
          supabase.from("sessions").select("id",{count:"exact",head:true}).eq("tester_id", profile.id),
          supabase.from("sessions").select("id",{count:"exact",head:true}).eq("tester_id", profile.id).eq("status","sent"),
          supabase.from("sessions").select("id",{count:"exact",head:true}).eq("tester_id", profile.id).eq("status","complete"),
        ]);
        setStats({ a: total ?? 0, b: sent ?? 0, c: pend ?? 0 });
      } else if (role === "analyzer") {
        const [{ count: q }, { count: done }] = await Promise.all([
          supabase.from("sessions").select("id",{count:"exact",head:true}).eq("sent_to_analyzer_id", profile.id).eq("status","sent"),
          supabase.from("analyses").select("id",{count:"exact",head:true}).eq("analyzer_id", profile.id).eq("status","sent"),
        ]);
        setStats({ a: q ?? 0, b: done ?? 0, c: 0 });
      } else if (role === "integrator") {
        const [{ count: pend }, { count: closed }] = await Promise.all([
          supabase.from("reports").select("id",{count:"exact",head:true}).eq("sent_to_integrator_id", profile.id).eq("status","pending"),
          supabase.from("field_checks").select("id",{count:"exact",head:true}).eq("integrator_id", profile.id),
        ]);
        setStats({ a: pend ?? 0, b: closed ?? 0, c: 0 });
      }
      // Activity feed — recent sessions/analyses/checks
      const { data: s } = await supabase.from("sessions").select("vehicle_id,status,created_at").order("created_at",{ascending:false}).limit(6);
      setFeed((s ?? []).map((r) => ({
        kind: "session", label: `Session ${r.status}`, when: new Date(r.created_at).toLocaleString(), vehicle: r.vehicle_id,
      })));
    })();
  }, [profile, role]);

  const cards = role === "tester" ? [
    { label: "Sessions Total", value: stats.a },
    { label: "Sent to Analyzer", value: stats.b, tone: "brass" as const },
    { label: "Awaiting Send", value: stats.c },
  ] : role === "analyzer" ? [
    { label: "Incoming Queue", value: stats.a, tone: "brass" as const, hint: "Sessions waiting for analysis" },
    { label: "Reports Sent", value: stats.b, hint: "Delivered to integrators" },
    { label: "Cases Resolved", value: "—" },
  ] : [
    { label: "Reports Awaiting Field Check", value: stats.a, tone: "brass" as const },
    { label: "Cases Closed", value: stats.b },
    { label: "Disputes Sent Back", value: "—" },
  ];

  const quick = role === "tester"
    ? { to: "/app/record", label: "Start a new recording →" }
    : role === "analyzer"
    ? { to: "/app/queue", label: "Open the incoming queue →" }
    : { to: "/app/reports", label: "Review incoming reports →" };

  return (
    <>
      <PageHeader
        eyebrow={`Console · ${role ?? ""}`}
        title={<>Welcome, <em className="brass-underline not-italic">{profile?.name?.split(" ")[0] ?? "there"}</em>.</>}
        subtitle="Your daily view of the pipeline — recordings, analyses, and field checks threaded to a single vehicle ID."
        actions={<Link to={quick.to} className="px-4 h-11 grid place-items-center bg-primary text-primary-foreground rounded hover:bg-primary/90 text-[14px]">{quick.label}</Link>}
      />
      <Section eyebrow="Today" title="At a glance">
        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((c, i) => <StatCard key={i} {...c} />)}
        </div>
      </Section>
      <Section eyebrow="Recent activity" title="Pipeline movements">
        <div className="card-editorial divide-y divide-border">
          {feed.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No activity yet — start your first case.</div>}
          {feed.map((f, i) => (
            <div key={i} className="p-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <StatusPill tone="default">{f.kind}</StatusPill>
                <span className="font-mono-tabular text-foreground">{f.vehicle}</span>
                <span className="text-muted-foreground">{f.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{f.when}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
