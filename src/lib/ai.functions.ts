import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeInput = z.object({
  dtc_code: z.string(),
  vehicle_id: z.string(),
  trend_summary: z.string(),
  history: z.string().optional(),
});

const ReportInput = z.object({
  dtc_code: z.string(),
  vehicle_id: z.string(),
  deviation: z.string(),
  causes: z.string(),
  history: z.string().optional(),
});

async function callOpenAI(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

export const analyzeFault = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const system = "You are a senior commercial-vehicle diagnostic engineer for a truck OEM. You analyze pre-fault engine telemetry (RPM, coolant temperature, engine load, speed) captured in the 10–30 minutes before a DTC fires. Identify the anomalies in the trajectory, suggest the 2–3 most likely root causes with confidence 0–1, and recommend a fix. Return STRICT JSON with keys: deviation_summary (string, 2–3 sentences), causes (array of {cause: string, confidence: number, rationale: string}), recommended_fix (string).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nPre-fault trend summary:\n${data.trend_summary}\n\nVehicle history:\n${data.history ?? "No prior cases."}\n\nReturn ONLY JSON, no prose, no markdown.`;
    const raw = await callOpenAI(system, user);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      return JSON.parse(cleaned) as { deviation_summary: string; causes: {cause:string;confidence:number;rationale:string}[]; recommended_fix: string };
    } catch {
      return { deviation_summary: raw, causes: [], recommended_fix: "" };
    }
  });

export const draftReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const system = "You are a diagnostic report writer for a commercial fleet workshop. Write a clear, plain-language field report for the integrator who will physically verify the vehicle. Return STRICT JSON with keys: issue (1–2 sentences), evidence (2–4 sentences citing the deviations), recommended_fix (numbered inspection/repair steps), history_notes (1–2 sentences).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nDeviation observed:\n${data.deviation}\n\nSuspected causes:\n${data.causes}\n\nVehicle history:\n${data.history ?? "None."}\n\nReturn ONLY JSON.`;
    const raw = await callOpenAI(system, user);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      return JSON.parse(cleaned) as { issue: string; evidence: string; recommended_fix: string; history_notes: string };
    } catch {
      return { issue: raw.slice(0, 200), evidence: raw, recommended_fix: "", history_notes: "" };
    }
  });
