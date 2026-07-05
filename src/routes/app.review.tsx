import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-primitives";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/review")({
  validateSearch: (s: Record<string, unknown>) => ({ reportId: (s.reportId as string | undefined) ?? undefined }),
  component: Review,
});

function Review() {
  const { reportId } = useSearch({ from: "/app/review" });
  const nav = useNavigate();
  const [report, setReport] = useState<{ id: string; vehicle_id: string; issue: string; evidence: string; recommended_fix: string; history_notes: string; status: string } | null>(null);

  useEffect(() => {
    if (!reportId) return;
    supabase.from("reports").select("id,vehicle_id,issue,evidence,recommended_fix,history_notes,status").eq("id", reportId).maybeSingle()
      .then(({ data }) => setReport(data as never));
  }, [reportId]);

  if (!report) return (
    <>
      <PageHeader eyebrow="Integrator" title="Report Review" subtitle="Pick a report from the incoming list." />
      <Section><div className="card-editorial p-10 text-center text-muted-foreground">No report loaded.</div></Section>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow={`Report · ${report.vehicle_id}`}
        title="Analyst's brief"
        subtitle="Read-only. This is the analyst's report as delivered — no AI reinterpretation here."
        actions={
          <button onClick={() => nav({ to: "/app/field", search: { reportId: report.id } as never })} className="h-11 px-4 bg-accent text-accent-foreground rounded hover:opacity-90">Start field check →</button>
        }
      />
      <Section>
        <article className="card-editorial p-10 max-w-3xl mx-auto space-y-6 text-[15.5px] leading-relaxed">
          <header className="pb-6 border-b border-border">
            <div className="eyebrow">Vordenk Diagnostic Report</div>
            <h2 className="text-3xl mt-2">Vehicle {report.vehicle_id}</h2>
          </header>
          <div>
            <div className="eyebrow mb-2">Issue</div>
            <p>{report.issue}</p>
          </div>
          <div>
            <div className="eyebrow mb-2">Evidence</div>
            <p className="whitespace-pre-line">{report.evidence}</p>
          </div>
          <div>
            <div className="eyebrow mb-2">Recommended Fix</div>
            <p className="whitespace-pre-line">{report.recommended_fix}</p>
          </div>
          {report.history_notes && (
            <div>
              <div className="eyebrow mb-2">History</div>
              <p>{report.history_notes}</p>
            </div>
          )}
        </article>
      </Section>
    </>
  );
}
