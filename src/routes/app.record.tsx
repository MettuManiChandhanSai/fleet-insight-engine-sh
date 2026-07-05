import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateTrace, DTC_POOL, type Sample } from "@/lib/mock-trace";
import { exportSamplesAsCSV, downloadCSV } from "@/lib/csv-export";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { toast } from "sonner";
import { Radio, Square, Zap, Download } from "lucide-react";

export const Route = createFileRoute("/app/record")({ component: Record });

function Record() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [vehicles, setVehicles] = useState<{vehicle_id:string; model:string}[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [state, setState] = useState<"idle"|"recording"|"complete">("idle");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [faultAt, setFaultAt] = useState<number | null>(null);
  const traceRef = useRef<Sample[]>([]);
  const cursorRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.from("vehicles").select("vehicle_id,model").then(({ data }) => setVehicles(data ?? []));
  }, []);

  function start() {
    if (!vehicleId) return toast.error("Select a vehicle first.");
    setSamples([]); setFaultAt(null);
    traceRef.current = generateTrace(20);
    cursorRef.current = 0;
    setState("recording");
    timerRef.current = setInterval(() => {
      const next = traceRef.current[cursorRef.current++];
      if (!next) { stop(); return; }
      setSamples((prev) => {
        const arr = [...prev, next];
        // Trigger a fault 80% of the way through
        if (arr.length === Math.floor(traceRef.current.length * 0.85)) {
          setFaultAt(next.t);
          toast.warning(`DTC fired at ${Math.round(next.t/60)}m`);
        }
        return arr;
      });
    }, 120); // ~8x realtime for demo
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setState("complete");
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const completeness = useMemo(() => {
    if (samples.length === 0) return 0;
    const covered = Math.min(100, Math.round((samples.length / (20*6)) * 100));
    return covered;
  }, [samples]);

  function exportSessionToCSV() {
    const csv = exportSamplesAsCSV(samples, vehicleId, faultAt ? DTC_POOL[Math.floor(Math.random() * DTC_POOL.length)] : null);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    downloadCSV(csv, `session_${vehicleId}_${timestamp}.csv`);
    toast.success("CSV exported successfully");
  }

  async function confirmAndSend() {
    if (!profile) return;
    const dtc = DTC_POOL[Math.floor(Math.random() * DTC_POOL.length)];
    const { data, error } = await supabase.from("sessions").insert({
      vehicle_id: vehicleId, tester_id: profile.id,
      end_time: new Date().toISOString(),
      samples: samples as unknown as never,
      dtc_code: faultAt ? dtc : null,
      completeness_score: completeness,
      status: "complete",
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Recording saved. Choose an analyzer to send to.");
    nav({ to: "/app/team", search: { sessionId: data.id } as never });
  }

  return (
    <>
      <PageHeader
        eyebrow="Tester · Record Vehicle"
        title="Capture a live diagnostic trace."
        subtitle="Connect the OBD-II harness, pick the vehicle, and record. Vordenk streams the 20 minutes leading into the fault, not just the moment it fires."
      />
      <Section>
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Left controls */}
          <div className="card-editorial p-6 space-y-5">
            <div>
              <label className="eyebrow block mb-2">Vehicle</label>
              <select value={vehicleId} onChange={(e)=>setVehicleId(e.target.value)} disabled={state==="recording"}
                className="w-full h-11 px-3 bg-card border border-border rounded font-mono-tabular text-[15px]">
                <option value="">— Select vehicle —</option>
                {vehicles.map((v) => <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id} · {v.model}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <div className="eyebrow">Status</div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusPill tone={state==="idle" ? "default" : "ok"}>Connected</StatusPill>
                <StatusPill tone={state==="recording" ? "brass" : "default"}>{state==="recording" ? "Recording" : "Standby"}</StatusPill>
                {faultAt !== null && <StatusPill tone="warn">Fault Detected</StatusPill>}
              </div>
            </div>
            {state === "idle" && (
              <button onClick={start} className="w-full h-14 bg-primary text-primary-foreground rounded flex items-center justify-center gap-3 hover:bg-primary/90 text-lg">
                <Radio className="h-5 w-5" /> Start Recording
              </button>
            )}
            {state === "recording" && (
              <button onClick={stop} className="w-full h-14 bg-destructive text-destructive-foreground rounded flex items-center justify-center gap-3 hover:opacity-90 text-lg">
                <Square className="h-5 w-5" /> Stop Recording
              </button>
            )}
            {state === "complete" && (
              <>
                <div className="p-4 bg-muted rounded space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-mono-tabular">{Math.round(samples.length/6)} min</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Completeness</span><span className="font-mono-tabular">{completeness}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fault fired</span><span className="font-mono-tabular">{faultAt !== null ? "Yes" : "No"}</span></div>
                </div>
                <button onClick={confirmAndSend} className="w-full h-12 bg-accent text-accent-foreground rounded hover:opacity-90">
                  Confirm & choose analyzer →
                </button>
                <button onClick={exportSessionToCSV} className="w-full h-10 border border-border rounded text-sm hover:bg-muted flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Export as CSV
                </button>
                <button onClick={() => { setState("idle"); setSamples([]); setFaultAt(null); }} className="w-full h-10 border border-border rounded text-sm hover:bg-muted">
                  Discard & record again
                </button>
              </>
            )}
          </div>

          {/* Right — live traces */}
          <div className="space-y-4">
            {(["rpm","temp","load","speed"] as const).map((key) => (
              <div key={key} className="card-editorial p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="eyebrow">{key === "rpm" ? "Engine RPM" : key === "temp" ? "Coolant °C" : key === "load" ? "Engine Load %" : "Speed km/h"}</div>
                  <div className="font-mono-tabular text-sm">{samples.at(-1)?.[key] ?? "—"}</div>
                </div>
                <div className="h-24">
                  <ResponsiveContainer>
                    <LineChart data={samples}>
                      <XAxis dataKey="t" hide />
                      <YAxis hide domain={["auto","auto"]} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                      <Line type="monotone" dataKey={key} stroke="var(--accent-500)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                      {faultAt !== null && <ReferenceLine x={faultAt} stroke="var(--destructive)" strokeDasharray="3 3" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
            {samples.length === 0 && (
              <div className="card-editorial p-10 text-center text-muted-foreground">
                <Zap className="h-6 w-6 mx-auto mb-3 opacity-40" />
                Press <b>Start Recording</b> to stream engine parameters at 1 sample per 10 seconds.
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
