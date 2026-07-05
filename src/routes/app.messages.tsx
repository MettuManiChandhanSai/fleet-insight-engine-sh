import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({ component: Messages });

type Msg = { id: string; vehicle_id: string; sender_role: string; content: string; created_at: string; sender_id: string };

function Messages() {
  const { profile, role } = useAuth();
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    supabase.from("vehicles").select("vehicle_id").then(({ data }) => {
      const list = (data ?? []).map((x) => x.vehicle_id);
      setVehicles(list);
      if (list.length && !selected) setSelected(list[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => supabase.from("messages").select("id,vehicle_id,sender_role,content,created_at,sender_id")
      .eq("vehicle_id", selected).order("created_at",{ascending:true})
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));
    load();
    const ch = supabase.channel(`msg-${selected}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `vehicle_id=eq.${selected}` },
      () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  async function send() {
    if (!profile || !role || !text.trim() || !selected) return;
    const { error } = await supabase.from("messages").insert({
      vehicle_id: selected, sender_id: profile.id, sender_role: role, content: text.trim(),
    });
    if (error) return toast.error(error.message);
    setText("");
  }

  return (
    <>
      <PageHeader eyebrow="Shared" title="Case messages." subtitle="One thread per vehicle. Tester, analyzer, integrator — all in the same conversation." />
      <Section>
        <div className="grid lg:grid-cols-[260px_1fr] gap-6 max-w-5xl">
          <div className="card-editorial p-3 max-h-[70vh] overflow-y-auto">
            {vehicles.map((v) => (
              <button key={v} onClick={() => setSelected(v)}
                className={`w-full text-left px-3 py-2 rounded font-mono-tabular text-sm ${selected===v?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>{v}</button>
            ))}
          </div>
          <div className="card-editorial flex flex-col h-[70vh]">
            <div className="p-4 border-b border-border eyebrow">Thread — {selected}</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && <div className="text-center text-muted-foreground text-sm p-8">No messages yet.</div>}
              {msgs.map((m) => {
                const mine = m.sender_id === profile?.id;
                return (
                  <div key={m.id} className={`max-w-[75%] ${mine ? "ml-auto" : ""}`}>
                    <div className={`px-4 py-2 rounded ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="text-[11px] uppercase tracking-widest opacity-70 mb-1">{m.sender_role}</div>
                      <div className="text-sm">{m.content}</div>
                    </div>
                    <div className={`text-[10px] text-muted-foreground mt-1 ${mine ? "text-right" : ""}`}>{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Post to this case…"
                className="flex-1 h-10 px-3 border border-border bg-card rounded outline-none focus:border-accent text-sm" />
              <button onClick={send} className="h-10 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90">Send</button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
