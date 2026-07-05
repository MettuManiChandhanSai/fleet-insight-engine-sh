import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, Section, StatusPill } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/team")({
  validateSearch: (s: Record<string, unknown>) => ({
    sessionId: (s.sessionId as string | undefined) ?? undefined,
    reportId:  (s.reportId as string | undefined) ?? undefined,
  }),
  component: Team,
});

type Member = { id: string; name: string; email: string; is_online: boolean; case_load: number; role: string };

function Team() {
  const { profile, role } = useAuth();
  const { sessionId, reportId } = useSearch({ from: "/app/team" });
  const nav = useNavigate();

  // Who's the next role in the pipeline?
  const nextRole = role === "tester" ? "analyzer" : role === "analyzer" ? "integrator" : "analyzer";
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rr } = await supabase.from("user_roles").select("user_id,role").eq("role", nextRole);
      const ids = (rr ?? []).map((x) => x.user_id);
      if (ids.length === 0) return setMembers([]);
      const { data: p } = await supabase.from("profiles").select("id,name,email,is_online,case_load").in("id", ids);
      setMembers((p ?? []).map((x) => ({ ...x, role: nextRole })));
    })();
  }, [nextRole]);

  async function sendSession(m: Member) {
    if (!sessionId) return toast.error("No session selected — go via My Recordings.");
    setBusy(m.id);
    const { error } = await supabase.from("sessions").update({ sent_to_analyzer_id: m.id, status: "sent" }).eq("id", sessionId);
    if (!error) await supabase.from("notifications").insert({ user_id: m.id, type: "session", message: `New session assigned to you`, vehicle_id: null });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Sent to ${m.name}`);
    nav({ to: "/app/dashboard" });
  }

  async function sendReport(m: Member) {
    if (!reportId) return toast.error("No report selected — go via Report Builder.");
    setBusy(m.id);
    const { error } = await supabase.from("reports").update({ sent_to_integrator_id: m.id, status: "pending" }).eq("id", reportId);
    if (!error) await supabase.from("notifications").insert({ user_id: m.id, type: "report", message: "New report awaiting field check" });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Delivered to ${m.name}`);
    nav({ to: "/app/dashboard" });
  }

  const action = role === "tester" ? sendSession : role === "analyzer" ? sendReport : sendSession;
  const targetId = role === "tester" ? sessionId : role === "analyzer" ? reportId : sessionId;

  return (
    <>
      <PageHeader
        eyebrow={`${role} → ${nextRole}`}
        title={role === "tester" ? "Send to an analyzer." : role === "analyzer" ? "Deliver to an integrator." : "Send back to an analyzer."}
        subtitle="Pick the person by name. You'll see their current case load and status — no auto-assign."
      />
      <Section>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="card-editorial p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
                <StatusPill tone={m.is_online ? "ok" : "default"}>{m.is_online ? "Online" : "Offline"}</StatusPill>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div><div className="eyebrow">Case Load</div><div className="text-2xl font-mono-tabular mt-1">{m.case_load}</div></div>
                <button disabled={!targetId || busy === m.id}
                  onClick={() => action(m)}
                  className="h-10 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40">
                  {busy === m.id ? "Sending…" : "Send →"}
                </button>
              </div>
              {!targetId && <div className="text-xs text-muted-foreground mt-3 italic">Open a case from the pipeline first to enable Send.</div>}
            </div>
          ))}
          {members.length === 0 && <div className="col-span-full text-center text-muted-foreground p-10">No {nextRole}s available yet.</div>}
        </div>
      </Section>
    </>
  );
}
