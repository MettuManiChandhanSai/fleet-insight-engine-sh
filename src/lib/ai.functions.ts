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

async function callGemini(system: string, user: string, maxRetries: number = 3): Promise<string> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY missing");
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[v0] Google Gemini API call attempt ${attempt + 1}/${maxRetries}, model: gemini-1.5-flash`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: system },
                { text: user }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle rate limiting (429) with exponential backoff
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? String(Math.pow(2, attempt + 1) * 2), 10);
        const waitTime = Math.min(retryAfter * 1000, 45000); // Max 45s wait
        console.log(`[v0] Rate limited (429). Waiting ${waitTime}ms before retry (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!res.ok) {
        const t = await res.text();
        console.log(`[v0] API error ${res.status}: ${t.slice(0, 100)}`);
        
        // Don't retry on 401/403 auth errors
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Google Gemini Auth Error: Please check your API key is valid and active`);
        }
        
        // Retry on 500+ and 503 errors
        if ((res.status >= 500 || res.status === 503) && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt + 1) * 1500; // Longer delays
          console.log(`[v0] Server error ${res.status}. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`Google Gemini API error ${res.status}: ${t.slice(0, 150)}`);
      }
      
      const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
      const content = data.candidates[0]?.content?.parts[0]?.text;
      if (!content) throw new Error("Empty response from Google Gemini");
      console.log(`[v0] Google Gemini response received successfully`);
      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[v0] Attempt ${attempt + 1}/${maxRetries} failed: ${errorMsg.slice(0, 100)}`);
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`[v0] All ${maxRetries} attempts exhausted. Final error: ${errorMsg}`);
        throw error;
      }
      
      // Otherwise wait and retry with longer delays
      const delay = Math.pow(2, attempt + 1) * 2000; // Exponential backoff: 4s, 8s, 16s
      console.log(`[v0] Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded for Google Gemini API call");
}

export const analyzeFault = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const system = "You are a senior commercial-vehicle diagnostic engineer for a truck OEM. You analyze pre-fault engine telemetry (RPM, coolant temperature, engine load, speed) captured in the 10–30 minutes before a DTC fires. Identify the anomalies in the trajectory, suggest the 2–3 most likely root causes with confidence 0–1, and recommend a fix. Return STRICT JSON with keys: deviation_summary (string, 2–3 sentences), causes (array of {cause: string, confidence: number, rationale: string}), recommended_fix (string).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nPre-fault trend summary:\n${data.trend_summary}\n\nVehicle history:\n${data.history ?? "No prior cases."}\n\nReturn ONLY JSON, no prose, no markdown.`;
    console.log(`[v0] Starting analysis for vehicle ${data.vehicle_id} with DTC ${data.dtc_code}`);
    const raw = await callGemini(system, user, 4); // Increased from 3 to 4 retry attempts
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
    const raw = await callGemini(system, user);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      return JSON.parse(cleaned) as { issue: string; evidence: string; recommended_fix: string; history_notes: string };
    } catch {
      return { issue: raw.slice(0, 200), evidence: raw, recommended_fix: "", history_notes: "" };
    }
  });
