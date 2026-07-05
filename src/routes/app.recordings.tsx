import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/recordings")({ component: Recordings });

type Row = { id: string; vehicle_id: string; status: string; dtc_code: string | null; created_at: string; completeness_score: number | null };

function Recordings() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("sessions").select("id,vehicle_id,status,dtc_code,created_at,completeness_score")
      .eq("tester_id", profile.id).order("created_at",{ascending:false})
      .then(({ data }) => setRows(data as Row[] ?? []));
  }, [profile]);
  return (
    <>
      <PageHeader eyebrow="Tester" title="My Recordings" subtitle="Every session you've captured, threaded to its vehicle ID." />
      <Section>
        <div className="card-editorial overflow-hidden">
          <table className="w-full text-[14px]">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-4 eyebrow">Vehicle</th>
                <th className="p-4 eyebrow">DTC</th>
                <th className="p-4 eyebrow">Coverage</th>
                <th className="p-4 eyebrow">Status</th>
                <th className="p-4 eyebrow">When</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No recordings yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-4 font-mono-tabular">{r.vehicle_id}</td>
                  <td className="p-4 font-mono-tabular">{r.dtc_code ?? "—"}</td>
                  <td className="p-4 font-mono-tabular">{r.completeness_score ?? 0}%</td>
                  <td className="p-4"><StatusPill tone={r.status === "sent" ? "ok" : r.status === "complete" ? "brass" : "default"}>{r.status}</StatusPill></td>
                  <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    {r.status === "complete" && <Link to="/app/team" search={{ sessionId: r.id } as never} className="text-accent underline">Send →</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
