import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/vordenk-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const DEMOS = [
  { role: "Tester",     email: "tester@vordenk.demo",     accent: "Records the vehicle." },
  { role: "Analyzer",   email: "analyzer@vordenk.demo",   accent: "Diagnoses with AI." },
  { role: "Integrator", email: "integrator@vordenk.demo", accent: "Verifies in the field." },
];

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app/dashboard" });
    });
    // Ensure demo accounts exist
    fetch("/api/public/seed").catch(() => {});
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    nav({ to: "/app/dashboard" });
  }

  async function fillAndSignIn(demoEmail: string) {
    setEmail(demoEmail); setPassword("Vordenk@123");
    setBusy(true);
    setSeeding(true);
    // Re-run seed to guarantee accounts exist (idempotent)
    try { await fetch("/api/public/seed"); } catch {}
    setSeeding(false);
    const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: "Vordenk@123" });
    setBusy(false);
    if (error) return toast.error(error.message);
    nav({ to: "/app/dashboard" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — editorial hero */}
      <div className="hidden lg:flex flex-col justify-between p-14 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 24px)"
        }} />
        <div className="relative">
          <img src={logo.url} alt="Vordenk" className="h-16 w-auto object-contain brightness-0 invert opacity-90" />
          <div className="eyebrow mt-6 text-primary-foreground/70">Vol. 01 · Diagnostic Workbench</div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-5xl leading-[1.05] font-normal">
            From <em className="brass-underline not-italic">snapshot</em> to <em className="brass-underline not-italic">fingerprint</em>.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-primary-foreground/80">
            Two vehicles can throw the same fault code for entirely different reasons. Vordenk reads the twenty minutes <em>before</em> the code fires — the story, not the snapshot — so the right repair happens the first time.
          </p>
        </div>
        <div className="relative eyebrow text-primary-foreground/60">
          Tester · Analyzer · Integrator — one vehicle ID, three sets of eyes.
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="eyebrow mb-3">Sign in</div>
          <h2 className="text-3xl mb-8">Enter the console.</h2>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="eyebrow block mb-2">Email</label>
              <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
                className="w-full h-11 px-3 border border-border bg-card rounded outline-none focus:border-accent transition text-[15px]" />
            </div>
            <div>
              <label className="eyebrow block mb-2">Password</label>
              <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)}
                className="w-full h-11 px-3 border border-border bg-card rounded outline-none focus:border-accent transition text-[15px]" />
            </div>
            <button disabled={busy} type="submit"
              className="w-full h-11 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition disabled:opacity-50 text-[15px] tracking-wide">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-border">
            <div className="eyebrow mb-4">Demo accounts {seeding && "· preparing…"}</div>
            <div className="space-y-2">
              {DEMOS.map((d) => (
                <button key={d.email} onClick={() => fillAndSignIn(d.email)} disabled={busy}
                  className="w-full text-left p-3 border border-border hover:border-accent bg-card rounded transition group disabled:opacity-50">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[15px]">{d.role}</div>
                      <div className="text-xs text-muted-foreground">{d.email} · Vordenk@123</div>
                    </div>
                    <span className="text-xs text-accent-foreground bg-accent px-2 py-0.5 rounded">Enter →</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 italic">{d.accent}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
