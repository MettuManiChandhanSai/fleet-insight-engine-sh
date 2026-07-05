import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/app/field")({
  validateSearch: (s: Record<string, unknown>) => ({ reportId: (s.reportId as string | undefined) ?? undefined }),
  component: FieldCheck,
});

const DEFAULT_CHECKLIST = [
  "Coolant level & radiator condition inspected",
  "Ignition coil / spark plug condition confirmed",
  "MAF/MAP sensor readings match analysis",
  "No visible fluid leaks under load",
  "Fault reproduction attempted post-inspection",
];

function FieldCheck() {
  const { profile } = useAuth();
  const { reportId } = useSearch({ from: "/app/field" });
  const nav = useNavigate();
  const [report, setReport] = useState<{ id: string; vehicle_id: string; issue: string; recommended_fix: string } | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<null | "confirm" | "dispute">(null);

  useEffect(() => {
    if (!reportId) return;
    supabase.from("reports").select("id,vehicle_id,issue,recommended_fix").eq("id", reportId).maybeSingle()
      .then(({ data }) => setReport(data as never));
    const init: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((c) => (init[c] = false));
    setChecks(init);
  }, [reportId]);

  async function close(outcome: "confirmed" | "disputed") {
    if (!report || !profile) return;
    setBusy(outcome === "confirmed" ? "confirm" : "dispute");
    const { error } = await supabase.from("field_checks").insert({
      report_id: report.id, vehicle_id: report.vehicle_id, integrator_id: profile.id,
      checklist_results: checks as never, outcome, notes,
    });
    if (error) { setBusy(null); return toast.error(error.message); }
    await supabase.from("reports").update({ status: outcome === "confirmed" ? "reviewed" : "pending" }).eq("id", report.id);
    setBusy(null);
    toast.success(outcome === "confirmed" ? "Case closed." : "Sent back to analyzer.");
    nav({ to: "/app/dashboard" });
  }

  if (!report) return (
    <>
      <PageHeader eyebrow="Integrator" title="Field Verification" />
      <Section><div className="card-editorial p-10 text-center text-muted-foreground">Open a report to start the field check.</div></Section>
    </>
  );

  return (
    <>
      <PageHeader eyebrow={`Field Check · ${report.vehicle_id}`} title="Verify on the truck." subtitle="Physically confirm the analyst's diagnosis, then close or dispute. This decision is yours — never automated." />
      <Section>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 max-w-5xl">
          <div className="card-editorial p-6 space-y-4">
            <div className="eyebrow">Checklist</div>
            {Object.keys(checks).map((c) => (
              <label key={c} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={checks[c]} onChange={(e) => setChecks({ ...checks, [c]: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-accent-500" />
                <span className="text-[15px]">{c}</span>
              </label>
            ))}
            <div className="pt-4 border-t border-border">
              <label className="eyebrow block mb-2">Field notes</label>
              <textarea rows={5} value={notes} onChange={(e)=>setNotes(e.target.value)}
                className="w-full p-3 border border-border bg-card rounded outline-none focus:border-accent transition text-[15px]" />
            </div>
          </div>
          <div className="card-editorial p-6 space-y-4 self-start sticky top-4">
            <div>
              <div className="eyebrow mb-2">Report summary</div>
              <div className="text-sm"><b>Issue:</b> {report.issue}</div>
              <div className="text-sm mt-2 whitespace-pre-line"><b>Fix:</b> {report.recommended_fix}</div>
            </div>
            <div className="pt-4 border-t border-border space-y-2">
              <button onClick={() => close("confirmed")} disabled={busy!==null}
                className="w-full h-12 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> Confirm & close case
              </button>
              <button onClick={() => close("disputed")} disabled={busy!==null}
                className="w-full h-12 border border-destructive text-destructive rounded hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center gap-2 transition disabled:opacity-50">
                <XCircle className="h-4 w-4" /> Dispute & send back
              </button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
