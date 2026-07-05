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

// Ollama runs a local (or tunneled) server. Configure the endpoint and model via env vars.
// - OLLAMA_BASE_URL: e.g. "http://localhost:11434" for local dev, or an ngrok tunnel URL for deployed use.
// - OLLAMA_MODEL: e.g. "llama3.2", "llama3.1", "mistral", "qwen2.5". Must be pulled first: `ollama pull llama3.2`.
async function callOllama(system: string, user: string, maxRetries: number = 3): Promise<string> {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[v0] Ollama API call attempt ${attempt + 1}/${maxRetries}, model: ${model}, base: ${baseUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout (local models can be slow)

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: false,
          format: "json", // ask Ollama to constrain output to valid JSON
          options: {
            temperature: 0.3,
            num_predict: 800,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const t = await res.text();
        console.log(`[v0] Ollama error ${res.status}: ${t.slice(0, 150)}`);

        // 404 usually means the model isn't pulled yet.
        if (res.status === 404) {
          throw new Error(`Ollama model "${model}" not found. Run: ollama pull ${model}`);
        }

        // Retry on server errors.
        if (res.status >= 500 && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt + 1) * 1500;
          console.log(`[v0] Server error ${res.status}. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Ollama API error ${res.status}: ${t.slice(0, 150)}`);
      }

      const data = await res.json() as { message?: { content?: string } };
      const content = data.message?.content;
      if (!content) throw new Error("Empty response from Ollama");
      console.log(`[v0] Ollama response received successfully`);
      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[v0] Attempt ${attempt + 1}/${maxRetries} failed: ${errorMsg.slice(0, 120)}`);

      // Connection refused typically means Ollama isn't running / not reachable.
      if (errorMsg.includes("fetch failed") || errorMsg.includes("ECONNREFUSED")) {
        console.error(`[v0] Could not reach Ollama at ${baseUrl}. Is 'ollama serve' running and reachable?`);
      }

      if (attempt === maxRetries - 1) {
        console.error(`[v0] All ${maxRetries} attempts exhausted. Final error: ${errorMsg}`);
        throw error;
      }

      const delay = Math.pow(2, attempt + 1) * 2000; // 4s, 8s, 16s
      console.log(`[v0] Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded for Ollama API call");
}

export const analyzeFault = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const system = "You are a senior commercial-vehicle diagnostic engineer for a truck OEM. You analyze pre-fault engine telemetry (RPM, coolant temperature, engine load, speed) captured in the 10–30 minutes before a DTC fires. Identify the anomalies in the trajectory, suggest the 2–3 most likely root causes with confidence 0–1, and recommend a fix. Return STRICT JSON with keys: deviation_summary (string, 2–3 sentences), causes (array of {cause: string, confidence: number, rationale: string}), recommended_fix (string).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nPre-fault trend summary:\n${data.trend_summary}\n\nVehicle history:\n${data.history ?? "No prior cases."}\n\nReturn ONLY JSON, no prose, no markdown.`;
    console.log(`[v0] Starting analysis for vehicle ${data.vehicle_id} with DTC ${data.dtc_code}`);
    const raw = await callOllama(system, user, 4); // up to 4 retry attempts
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
    const raw = await callOllama(system, user);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      return JSON.parse(cleaned) as { issue: string; evidence: string; recommended_fix: string; history_notes: string };
    } catch {
      return { issue: raw.slice(0, 200), evidence: raw, recommended_fix: "", history_notes: "" };
    }
  });
