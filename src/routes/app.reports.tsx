import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/reports")({ component: Reports });

type Row = { id: string; vehicle_id: string; issue: string; status: string; created_at: string };

function Reports() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("reports").select("id,vehicle_id,issue,status,created_at")
      .eq("sent_to_integrator_id", profile.id).order("created_at",{ascending:false})
      .then(({ data }) => setRows(data as Row[] ?? []));
  }, [profile]);
  return (
    <>
      <PageHeader eyebrow="Integrator" title="Incoming reports." subtitle="Reports delivered to you, awaiting field verification." />
      <Section>
        <div className="card-editorial divide-y divide-border">
          {rows.length === 0 && <div className="p-10 text-center text-muted-foreground">No incoming reports.</div>}
          {rows.map((r) => (
            <Link key={r.id} to="/app/review" search={{ reportId: r.id } as never} className="block p-5 hover:bg-muted transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono-tabular text-lg">{r.vehicle_id}</span>
                  <StatusPill tone={r.status === "pending" ? "brass" : "default"}>{r.status}</StatusPill>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.issue}</div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
