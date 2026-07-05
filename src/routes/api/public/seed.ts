import { createFileRoute } from "@tanstack/react-router";

// Idempotently create the three demo accounts + roles.
export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const demos: { email: string; name: string; role: "tester" | "analyzer" | "integrator" }[] = [
          { email: "tester@vordenk.demo",     name: "Ravi Kumar",       role: "tester" },
          { email: "analyzer@vordenk.demo",   name: "Priya Nair",       role: "analyzer" },
          { email: "integrator@vordenk.demo", name: "Arjun Deshpande",  role: "integrator" },
        ];
        const results: unknown[] = [];
        for (const d of demos) {
          // Check existing
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
          const found = existing.users.find((u) => u.email === d.email);
          let userId = found?.id;
          if (!userId) {
            const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
              email: d.email,
              password: "Vordenk@123",
              email_confirm: true,
              user_metadata: { name: d.name },
            });
            if (error) { results.push({ email: d.email, error: error.message }); continue; }
            userId = created.user!.id;
          }
          await supabaseAdmin.from("profiles").upsert({
            id: userId, name: d.name, email: d.email, is_online: true,
          });
          await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: d.role });
          results.push({ email: d.email, id: userId, role: d.role, ok: true });
        }
        return Response.json({ ok: true, results });
      },
    },
  },
});
