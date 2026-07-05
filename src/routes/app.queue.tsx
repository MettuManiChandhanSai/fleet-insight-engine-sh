import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/queue")({ component: Queue });

type Row = { id: string; vehicle_id: string; dtc_code: string | null; created_at: string; status: string; completeness_score: number | null };

function Queue() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("sessions").select("id,vehicle_id,dtc_code,created_at,status,completeness_score")
      .eq("sent_to_analyzer_id", profile.id).order("created_at",{ascending:false})
      .then(({ data }) => setRows(data as Row[] ?? []));
  }, [profile]);
  return (
    <>
      <PageHeader eyebrow="Analyzer" title="Incoming queue." subtitle="Sessions handed to you, most recent first. Each one carries a vehicle ID that threads its full history." />
      <Section>
        <div className="card-editorial divide-y divide-border">
          {rows.length === 0 && <div className="p-10 text-center text-muted-foreground">No incoming sessions.</div>}
          {rows.map((r) => (
            <Link key={r.id} to="/app/workspace" search={{ sessionId: r.id } as never} className="flex items-center justify-between p-5 hover:bg-muted transition">
              <div className="flex items-center gap-6">
                <div className="font-mono-tabular text-lg">{r.vehicle_id}</div>
                <StatusPill tone="brass">{r.dtc_code ?? "no DTC"}</StatusPill>
                <span className="text-sm text-muted-foreground">Coverage {r.completeness_score ?? 0}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                <span className="text-accent">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
