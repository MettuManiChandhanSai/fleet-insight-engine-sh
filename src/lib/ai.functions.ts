import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";

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

async function callAI(system: string, user: string, maxRetries: number = 3): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[v0] AI API call attempt ${attempt + 1}/${maxRetries}, using Vercel AI Gateway`);
      
      const { text } = await generateText({
        model: "google/gemini-2.0-flash",
        system: system,
        prompt: user,
        temperature: 0.3,
        maxTokens: 800,
      });
      
      console.log(`[v0] AI response received successfully`);
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[v0] Attempt ${attempt + 1}/${maxRetries} failed: ${errorMsg.slice(0, 100)}`);
      
      // Check for auth errors
      if (errorMsg.includes("401") || errorMsg.includes("403") || errorMsg.includes("Unauthorized")) {
        console.error(`[v0] Auth error: ${errorMsg}`);
        throw new Error(`AI API Auth Error: Please check your API configuration`);
      }
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`[v0] All ${maxRetries} attempts exhausted. Final error: ${errorMsg}`);
        throw error;
      }
      
      // Otherwise wait and retry with exponential backoff
      const delay = Math.pow(2, attempt + 1) * 2000; // Exponential backoff: 4s, 8s, 16s
      console.log(`[v0] Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded for AI API call");
}

export const analyzeFault = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const system = "You are a senior commercial-vehicle diagnostic engineer for a truck OEM. You analyze pre-fault engine telemetry (RPM, coolant temperature, engine load, speed) captured in the 10–30 minutes before a DTC fires. Identify the anomalies in the trajectory, suggest the 2–3 most likely root causes with confidence 0–1, and recommend a fix. Return STRICT JSON with keys: deviation_summary (string, 2–3 sentences), causes (array of {cause: string, confidence: number, rationale: string}), recommended_fix (string).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nPre-fault trend summary:\n${data.trend_summary}\n\nVehicle history:\n${data.history ?? "No prior cases."}\n\nReturn ONLY JSON, no prose, no markdown.`;
    console.log(`[v0] Starting analysis for vehicle ${data.vehicle_id} with DTC ${data.dtc_code}`);
    const raw = await callAI(system, user, 4);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      const result = JSON.parse(cleaned) as { deviation_summary: string; causes: {cause:string;confidence:number;rationale:string}[]; recommended_fix: string };
      console.log(`[v0] Analysis completed successfully for vehicle ${data.vehicle_id}`);
      return result;
    } catch (e) {
      console.warn(`[v0] JSON parse failed, returning raw response. Error: ${e instanceof Error ? e.message : String(e)}`);
      return { deviation_summary: raw.slice(0, 300), causes: [], recommended_fix: "See deviation summary for raw AI response" };
    }
  });

export const draftReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const system = "You are a diagnostic report writer for a commercial fleet workshop. Write a clear, plain-language field report for the integrator who will physically verify the vehicle. Return STRICT JSON with keys: issue (1–2 sentences), evidence (2–4 sentences citing the deviations), recommended_fix (numbered inspection/repair steps), history_notes (1–2 sentences).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nDeviation observed:\n${data.deviation}\n\nSuspected causes:\n${data.causes}\n\nVehicle history:\n${data.history ?? "None."}\n\nReturn ONLY JSON.`;
    const raw = await callAI(system, user);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      return JSON.parse(cleaned) as { issue: string; evidence: string; recommended_fix: string; history_notes: string };
    } catch {
      return { issue: raw.slice(0, 200), evidence: raw, recommended_fix: "", history_notes: "" };
    }
  });
