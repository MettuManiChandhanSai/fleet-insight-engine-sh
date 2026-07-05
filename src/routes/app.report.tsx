import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { draftReport } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/report")({
  validateSearch: (s: Record<string, unknown>) => ({ analysisId: (s.analysisId as string | undefined) ?? undefined }),
  component: Report,
});

function Report() {
  const { profile } = useAuth();
  const { analysisId } = useSearch({ from: "/app/report" });
  const nav = useNavigate();
  const draft = useServerFn(draftReport);
  const [analysis, setAnalysis] = useState<{ id: string; vehicle_id: string; dtc_code: string | null; deviation_summary: {text:string}; ai_suggested_causes: {cause:string;confidence:number}[] } | null>(null);
  const [form, setForm] = useState({ issue: "", evidence: "", recommended_fix: "", history_notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!analysisId) return;
    supabase.from("analyses").select("id,vehicle_id,dtc_code,deviation_summary,ai_suggested_causes").eq("id", analysisId).maybeSingle()
      .then(({ data }) => setAnalysis(data as never));
  }, [analysisId]);

  async function autoDraft() {
    if (!analysis) return;
    setBusy(true);
    try {
      const causes = (analysis.ai_suggested_causes ?? []).map((c) => `- ${c.cause} (${Math.round(c.confidence*100)}%)`).join("\n");
      const res = await draft({ data: {
        dtc_code: analysis.dtc_code ?? "UNKNOWN",
        vehicle_id: analysis.vehicle_id,
        deviation: analysis.deviation_summary?.text ?? "",
        causes,
      }});
      setForm(res);
      toast.success("Report drafted — edit before sending.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function saveAndPickIntegrator() {
    if (!analysis || !profile) return;
    if (!form.issue) return toast.error("Draft or fill the report first.");
    await supabase.from("analyses").update({ status: "sent" }).eq("id", analysis.id);
    const { data, error } = await supabase.from("reports").insert({
      analysis_id: analysis.id, vehicle_id: analysis.vehicle_id,
      issue: form.issue, evidence: form.evidence, recommended_fix: form.recommended_fix, history_notes: form.history_notes,
      status: "pending",
    }).select("id").single();
    if (error) return toast.error(error.message);
    nav({ to: "/app/team", search: { reportId: data.id } as never });
  }

  if (!analysis) return (
    <>
      <PageHeader eyebrow="Analyzer" title="Report Builder" subtitle="Open a session from the workspace and run AI analysis to start a report." />
      <Section><div className="card-editorial p-10 text-center text-muted-foreground">No analysis loaded.</div></Section>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow={`Report · ${analysis.vehicle_id}`}
        title={<>Draft the field report</>}
        subtitle="Turn the deviation, causes, and history into a plain-language brief for the integrator. You are the author."
        actions={
          <button onClick={autoDraft} disabled={busy} className="h-11 px-4 border border-accent text-accent rounded hover:bg-accent hover:text-accent-foreground transition flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> {busy ? "Drafting…" : "AI draft"}
          </button>
        }
      />
      <Section>
        <div className="max-w-3xl space-y-5">
          {(["issue","evidence","recommended_fix","history_notes"] as const).map((k) => (
            <div key={k}>
              <label className="eyebrow block mb-2">
                {k === "issue" ? "Issue" : k === "evidence" ? "Evidence" : k === "recommended_fix" ? "Recommended fix" : "History notes"}
              </label>
              <textarea rows={k === "issue" ? 2 : 5} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full p-3 border border-border bg-card rounded outline-none focus:border-accent transition text-[15px] leading-relaxed" />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={saveAndPickIntegrator} className="h-11 px-5 bg-primary text-primary-foreground rounded hover:bg-primary/90">
              Save & choose integrator →
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}
