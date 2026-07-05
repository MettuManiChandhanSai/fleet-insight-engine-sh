import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
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

// ---------------------------------------------------------------------------
// AI backends
//
// 1. Groq (free tier, no credit card — https://console.groq.com)
//    - GROQ_API_KEY: free API key from console.groq.com
//    - GROQ_MODEL: optional override, defaults to "llama-3.3-70b-versatile".
//
// 2. Ollama (preferred when reachable)
//    - OLLAMA_BASE_URL: e.g. "http://localhost:11434" for local dev, or a
//      public tunnel URL (ngrok / cloudflared) when the app runs on a server.
//      NOTE: when this app is deployed or running in a cloud preview,
//      "localhost" refers to the SERVER, not your machine — you must expose
//      your Ollama with a tunnel and set OLLAMA_BASE_URL to that URL.
//    - OLLAMA_MODEL: e.g. "llama3.2", "mistral", "qwen2.5" (must be pulled).
//
// 2. Vercel AI Gateway (automatic fallback, zero config in previews)
//    - GATEWAY_MODEL: optional override, defaults to "openai/gpt-5.4-mini".
// ---------------------------------------------------------------------------

async function callGroq(system: string, user: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  console.log(`[v0] Trying Groq with model "${model}"`);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401) throw new Error("Groq API key is invalid. Get a free key at console.groq.com");
    if (res.status === 429) throw new Error("Groq rate limit hit (free tier). Wait a moment and try again.");
    throw new Error(`Groq API error ${res.status}: ${t.slice(0, 150)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");
  console.log("[v0] Groq responded successfully");
  return content;
}

async function callOllama(system: string, user: string, timeoutMs: number): Promise<string> {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";

  console.log(`[v0] Trying Ollama at ${baseUrl} with model "${model}" (timeout ${timeoutMs}ms)`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        format: "json", // constrain output to valid JSON
        options: { temperature: 0.3, num_predict: 800 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 404) {
        throw new Error(`Ollama model "${model}" not found. Run: ollama pull ${model}`);
      }
      throw new Error(`Ollama API error ${res.status}: ${t.slice(0, 150)}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) throw new Error("Empty response from Ollama");
    console.log("[v0] Ollama responded successfully");
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGateway(system: string, user: string): Promise<string> {
  const model = process.env.GATEWAY_MODEL ?? "openai/gpt-5.4-mini";
  console.log(`[v0] Using Vercel AI Gateway with model "${model}"`);
  try {
    const { text } = await generateText({
      model,
      instructions: system,
      prompt: user,
    });
    if (!text) throw new Error("Empty response from AI Gateway");
    console.log("[v0] AI Gateway responded successfully");
    return text;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("credit card")) {
      throw new Error(
        "AI Gateway needs billing setup: add a credit card to your Vercel team to unlock free AI credits, or set OLLAMA_BASE_URL to a reachable Ollama server."
      );
    }
    throw error;
  }
}

/**
 * Backend chain: Groq (free key) → Ollama (if configured) → AI Gateway.
 * Whichever is available first wins, so the analyzer always works.
 */
async function callAI(system: string, user: string): Promise<string> {
  // 1. Groq — free tier, no credit card required.
  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(system, user);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[v0] Groq failed (${msg.slice(0, 120)}). Trying next backend.`);
    }
  }

  // 2. Ollama — long timeout when explicitly configured, fast probe otherwise.
  const hasExplicitOllama = Boolean(process.env.OLLAMA_BASE_URL);
  const timeoutMs = hasExplicitOllama ? 120000 : 4000;
  try {
    return await callOllama(system, user, timeoutMs);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[v0] Ollama unavailable (${msg.slice(0, 120)}). Falling back to AI Gateway.`);
  }

  // 3. Vercel AI Gateway — last resort.
  return await callGateway(system, user);
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
  // Some models wrap JSON in prose — try to extract the first {...} block.
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("Could not parse JSON from AI response");
  }
}

export const analyzeFault = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const system =
      "You are a senior commercial-vehicle diagnostic engineer for a truck OEM. You analyze pre-fault engine telemetry (RPM, coolant temperature, engine load, speed) captured in the 10–30 minutes before a DTC fires. Identify the anomalies in the trajectory, suggest the 2–3 most likely root causes with confidence 0–1, and recommend a fix. Return STRICT JSON with keys: deviation_summary (string, 2–3 sentences), causes (array of {cause: string, confidence: number, rationale: string}), recommended_fix (string).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nPre-fault trend summary:\n${data.trend_summary}\n\nVehicle history:\n${data.history ?? "No prior cases."}\n\nReturn ONLY JSON, no prose, no markdown.`;
    console.log(`[v0] Starting analysis for vehicle ${data.vehicle_id} with DTC ${data.dtc_code}`);
    const raw = await callAI(system, user);
    try {
      const result = parseJsonResponse<{
        deviation_summary: string;
        causes: { cause: string; confidence: number; rationale: string }[];
        recommended_fix: string;
      }>(raw);
      console.log(`[v0] Analysis completed successfully for vehicle ${data.vehicle_id}`);
      return {
        deviation_summary: result.deviation_summary ?? "",
        causes: Array.isArray(result.causes) ? result.causes : [],
        recommended_fix: result.recommended_fix ?? "",
      };
    } catch (e) {
      console.warn(`[v0] JSON parse failed, returning raw response. Error: ${e instanceof Error ? e.message : String(e)}`);
      return {
        deviation_summary: raw.slice(0, 300),
        causes: [] as { cause: string; confidence: number; rationale: string }[],
        recommended_fix: "See deviation summary for raw AI response",
      };
    }
  });

export const draftReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const system =
      "You are a diagnostic report writer for a commercial fleet workshop. Write a clear, plain-language field report for the integrator who will physically verify the vehicle. Return STRICT JSON with keys: issue (1–2 sentences), evidence (2–4 sentences citing the deviations), recommended_fix (numbered inspection/repair steps), history_notes (1–2 sentences).";
    const user = `DTC: ${data.dtc_code}\nVehicle: ${data.vehicle_id}\nDeviation observed:\n${data.deviation}\n\nSuspected causes:\n${data.causes}\n\nVehicle history:\n${data.history ?? "None."}\n\nReturn ONLY JSON.`;
    const raw = await callAI(system, user);
    try {
      const result = parseJsonResponse<{ issue: string; evidence: string; recommended_fix: string; history_notes: string }>(raw);
      return {
        issue: result.issue ?? "",
        evidence: result.evidence ?? "",
        recommended_fix: result.recommended_fix ?? "",
        history_notes: result.history_notes ?? "",
      };
    } catch {
      return { issue: raw.slice(0, 200), evidence: raw, recommended_fix: "", history_notes: "" };
    }
  });
