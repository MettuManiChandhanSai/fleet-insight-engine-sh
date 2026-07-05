import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { analyzeFault } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/workspace")({
  validateSearch: (s: Record<string, unknown>) => ({ sessionId: (s.sessionId as string | undefined) ?? undefined }),
  component: Workspace,
});

type Sample = { t: number; rpm: number; temp: number; load: number; speed: number };
type Cause = { cause: string; confidence: number; rationale: string };

function Workspace() {
  const { profile } = useAuth();
  const { sessionId } = useSearch({ from: "/app/workspace" });
  const nav = useNavigate();
  const [session, setSession] = useState<{ id: string; vehicle_id: string; dtc_code: string | null; samples: Sample[] } | null>(null);
  const [ai, setAi] = useState<{ deviation_summary: string; causes: Cause[]; recommended_fix: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [selectedList, setSelectedList] = useState<{id:string;vehicle_id:string;dtc_code:string|null}[]>([]);
  const runAnalyze = useServerFn(analyzeFault);

  useEffect(() => {
    if (!profile) return;
    supabase.from("sessions").select("id,vehicle_id,dtc_code").eq("sent_to_analyzer_id", profile.id).eq("status","sent")
      .then(({ data }) => setSelectedList((data ?? []) as never));
  }, [profile]);

  useEffect(() => {
    if (!sessionId) { setSession(null); return; }
    supabase.from("sessions").select("id,vehicle_id,dtc_code,samples").eq("id", sessionId).maybeSingle()
      .then(({ data }) => setSession(data as never));
  }, [sessionId]);

  async function runAi() {
    if (!session) return;
    setAiBusy(true);
    try {
      const s = session.samples;
      if (s.length === 0) {
        toast.error("No samples to analyze");
        return;
      }
      const first = s[0], last = s[s.length-1];
      const summary = `${s.length} samples over ${Math.round(s.length*10/60)} min. RPM ${first.rpm}→${last.rpm}, Coolant ${first.temp}→${last.temp}°C, Load ${first.load}→${last.load}%, Speed ${first.speed}→${last.speed} km/h. Coolant crossed 94°C ${s.findIndex(x=>x.temp>=94)>=0 ? `at index ${s.findIndex(x=>x.temp>=94)}` : "never"}.`;
      console.log("[v0] Running AI analysis for vehicle:", session.vehicle_id);
      const res = await runAnalyze({ data: { dtc_code: session.dtc_code ?? "UNKNOWN", vehicle_id: session.vehicle_id, trend_summary: summary } });
      setAi(res);
      toast.success("AI analysis ready");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "AI analysis failed";
      console.error("[v0] AI analysis error:", errorMsg);
      
      if (errorMsg.includes("Auth Error")) {
        toast.error("❌ Invalid Google Gemini API key. Check your environment variables.");
      } else if (errorMsg.includes("429")) {
        toast.error("🔄 API rate limited. Retrying automatically...");
      } else if (errorMsg.includes("Max retries")) {
        toast.error("⏱️ Analysis took too long. Try again in a few moments.");
      } else {
        toast.error(`⚠️ ${errorMsg}`);
      }
    } finally { setAiBusy(false); }
  }

  async function saveAndBuildReport() {
    if (!session || !ai || !profile) return;
    const { data, error } = await supabase.from("analyses").insert({
      session_id: session.id, vehicle_id: session.vehicle_id, analyzer_id: profile.id,
      dtc_code: session.dtc_code, deviation_summary: { text: ai.deviation_summary } as never,
      ai_suggested_causes: ai.causes as never, status: "draft",
    }).select("id").single();
    if (error) return toast.error(error.message);
    nav({ to: "/app/report", search: { analysisId: data.id } as never });
  }

  if (!sessionId || !session) {
    return (
      <>
        <PageHeader eyebrow="Analyzer" title="Analysis Workspace" subtitle="Pick a session from your queue to open the pre-fault trajectory." />
        <Section>
          <div className="card-editorial divide-y divide-border">
            {selectedList.length === 0 && <div className="p-10 text-center text-muted-foreground">Nothing in queue. Ask a tester to send you a session.</div>}
            {selectedList.map((r) => (
              <button key={r.id} onClick={() => nav({ to: "/app/workspace", search: { sessionId: r.id } as never })} className="w-full text-left p-5 hover:bg-muted flex items-center justify-between">
                <div className="flex items-center gap-4"><span className="font-mono-tabular">{r.vehicle_id}</span><StatusPill tone="brass">{r.dtc_code ?? "no DTC"}</StatusPill></div>
                <span className="text-accent">Open →</span>
              </button>
            ))}
          </div>
        </Section>
      </>
    );
  }

  const faultIdx = session.samples.findIndex((x) => x.temp >= 94);
  const faultAt = faultIdx >= 0 ? session.samples[faultIdx].t : null;

  return (
    <>
      <PageHeader
        eyebrow={`Analyzer · ${session.vehicle_id}`}
        title={<>DTC <em className="brass-underline not-italic">{session.dtc_code ?? "—"}</em></>}
        subtitle="The 20 minutes leading into the fault — not just the moment it fired. AI reads the trajectory; you decide."
      />
      <Section>
        <div className="grid xl:grid-cols-[1fr_420px] gap-6">
          {/* Charts */}
          <div className="space-y-4">
            {(["rpm","temp","load","speed"] as const).map((k) => (
              <div key={k} className="card-editorial p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="eyebrow">{k === "rpm" ? "Engine RPM" : k === "temp" ? "Coolant °C" : k === "load" ? "Engine Load %" : "Speed km/h"}</div>
                  <div className="font-mono-tabular text-sm text-muted-foreground">
                    {session.samples[0]?.[k]} → {session.samples.at(-1)?.[k]}
                  </div>
                </div>
                <div className="h-32">
                  <ResponsiveContainer>
                    <LineChart data={session.samples}>
                      <XAxis dataKey="t" tickFormatter={(v)=>`${Math.round(v/60)}m`} stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto","auto"]} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                      <Line type="monotone" dataKey={k} stroke="var(--accent-500)" strokeWidth={1.5} dot={false} />
                      {faultAt !== null && <ReferenceLine x={faultAt} stroke="var(--destructive)" strokeDasharray="3 3" label={{ value: "Fault", fill: "var(--destructive)", fontSize: 10 }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* AI Panel */}
          <div className="card-editorial p-6 sticky top-4 self-start">
            <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-accent" /><div className="eyebrow">AI Insight</div></div>
            {!ai && (
              <>
                <p className="text-sm text-muted-foreground">Send the trajectory + DTC + history to Vordenk's diagnostic model. You can accept, edit, or override.</p>
                <button onClick={runAi} disabled={aiBusy} className="mt-4 w-full h-11 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
                  {aiBusy ? "Analyzing…" : "Run AI analysis"}
                </button>
              </>
            )}
            {ai && (
              <div className="space-y-4">
                <div>
                  <div className="eyebrow mb-1">Deviation</div>
                  <p className="text-sm leading-relaxed">{ai.deviation_summary}</p>
                </div>
                <div>
                  <div className="eyebrow mb-2">Likely causes</div>
                  <div className="space-y-2">
                    {ai.causes.map((c, i) => (
                      <div key={i} className="p-3 bg-muted rounded">
                        <div className="flex items-baseline justify-between">
                          <div className="text-sm font-medium">{c.cause}</div>
                          <div className="text-xs font-mono-tabular text-accent">{Math.round(c.confidence*100)}%</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{c.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Recommended fix</div>
                  <p className="text-sm leading-relaxed">{ai.recommended_fix}</p>
                </div>
                <button onClick={saveAndBuildReport} className="w-full h-11 bg-accent text-accent-foreground rounded hover:opacity-90">
                  Accept & draft report →
                </button>
                <button onClick={runAi} className="w-full h-9 border border-border rounded text-sm hover:bg-muted">Re-run</button>
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
