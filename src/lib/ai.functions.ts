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

async function callOpenAI(system: string, user: string, maxRetries: number = 3): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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
          max_tokens: 1000, // Prevent token overflow
        }),
      });
      
      // Handle rate limiting (429) with exponential backoff
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? String(Math.pow(2, attempt)), 10);
        const waitTime = Math.min(retryAfter * 1000, 30000); // Max 30s wait
        console.log(`[v0] Rate limited. Waiting ${waitTime}ms before retry (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!res.ok) {
        const t = await res.text();
        // Don't retry on 401/403 auth errors
        if (res.status === 401 || res.status === 403) {
          throw new Error(`OpenAI Auth Error: Please check your API key`);
        }
        // Retry on 500+ errors
        if (res.status >= 500 && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[v0] Server error. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
      }
      
      const data = await res.json() as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content ?? "";
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) throw error;
      
      // Otherwise wait and retry
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[v0] Request failed. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded for OpenAI API call");
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
