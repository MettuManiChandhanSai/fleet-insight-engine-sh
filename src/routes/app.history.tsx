import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/history")({ component: History });

type Vehicle = { vehicle_id: string; model: string; fleet: string };
type Event = { when: string; kind: "session" | "analysis" | "report" | "check"; label: string; extra?: string };

function History() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    supabase.from("vehicles").select("vehicle_id,model,fleet").then(({ data }) => {
      setVehicles((data ?? []) as Vehicle[]);
      if (data && data.length > 0 && !selected) setSelected(data[0].vehicle_id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [{ data: s }, { data: a }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("sessions").select("created_at,dtc_code,status").eq("vehicle_id", selected),
        supabase.from("analyses").select("created_at,dtc_code,status").eq("vehicle_id", selected),
        supabase.from("reports").select("created_at,issue,status").eq("vehicle_id", selected),
        supabase.from("field_checks").select("created_at,outcome,notes").eq("vehicle_id", selected),
      ]);
      const all: Event[] = [
        ...(s ?? []).map((x) => ({ when: x.created_at, kind: "session" as const, label: `Session ${x.status}`, extra: x.dtc_code ?? undefined })),
        ...(a ?? []).map((x) => ({ when: x.created_at, kind: "analysis" as const, label: `Analysis ${x.status}`, extra: x.dtc_code ?? undefined })),
        ...(r ?? []).map((x) => ({ when: x.created_at, kind: "report" as const, label: `Report ${x.status}`, extra: x.issue.slice(0, 90) })),
        ...(c ?? []).map((x) => ({ when: x.created_at, kind: "check" as const, label: `Field check ${x.outcome}`, extra: x.notes ?? undefined })),
      ].sort((a,b) => (a.when < b.when ? 1 : -1));
      setEvents(all);
    })();
  }, [selected]);

  return (
    <>
      <PageHeader eyebrow="Shared" title="Vehicle History" subtitle="Every recording, analysis, report and field check for a single vehicle — one continuous story." />
      <Section>
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <div className="card-editorial p-4">
            <div className="eyebrow mb-3 px-2">Fleet</div>
            <div className="space-y-1">
              {vehicles.map((v) => (
                <button key={v.vehicle_id} onClick={() => setSelected(v.vehicle_id)}
                  className={`w-full text-left p-3 rounded transition ${selected === v.vehicle_id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <div className="font-mono-tabular text-sm">{v.vehicle_id}</div>
                  <div className={`text-xs ${selected===v.vehicle_id?"opacity-80":"text-muted-foreground"}`}>{v.model} · {v.fleet}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="card-editorial p-6">
            <div className="eyebrow mb-4">Timeline — {selected || "—"}</div>
            {events.length === 0 && <div className="text-center text-muted-foreground p-10 text-sm">No history yet for this vehicle.</div>}
            <ol className="relative border-l border-border pl-6 space-y-6">
              {events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-accent border-2 border-background" />
                  <div className="flex items-center gap-3">
                    <StatusPill tone="default">{e.kind}</StatusPill>
                    <span className="text-sm">{e.label}</span>
                    {e.extra && <span className="text-xs text-muted-foreground font-mono-tabular">{e.extra}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(e.when).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>
    </>
  );
}
