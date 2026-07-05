import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import OpenAI from "openai";

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[v0] OPENAI_API_KEY is not set in environment variables");
    throw new Error("OPENAI_API_KEY is missing. Please add it to your .env file or Vercel environment variables.");
  }
  
  console.log("[v0] Initializing OpenAI client with API key");
  const openai = new OpenAI({ apiKey });
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[v0] OpenAI API call attempt ${attempt + 1}/${maxRetries}, model: gpt-4o-mini`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      console.log(`[v0] OpenAI response received successfully (${content.length} chars)`);
      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[v0] Attempt ${attempt + 1}/${maxRetries} failed: ${errorMsg.slice(0, 150)}`);
      
      // Check for specific error types
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("invalid_api_key")) {
        console.error("[v0] Authentication error: API key is invalid or expired");
        throw new Error("OpenAI API key is invalid. Please check your OPENAI_API_KEY environment variable.");
      }
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`[v0] All ${maxRetries} attempts exhausted. Final error: ${errorMsg}`);
        throw error;
      }
      
      // Otherwise wait and retry with exponential backoff
      const delay = Math.pow(2, attempt + 1) * 2000;
      console.log(`[v0] Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded for OpenAI API call");
}

export const analyzeFault = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const system = `You are a senior commercial-vehicle diagnostic engineer for a truck OEM. You analyze pre-fault engine telemetry (RPM, coolant temperature, engine load, speed) captured in the 10–30 minutes before a DTC fires.

Your analysis must be COMPREHENSIVE and DETAILED:

1. **Deviation Summary**: Thoroughly describe the anomalies and deviations observed in the telemetry trajectory. Be specific about what changed, when it changed, and the magnitude of changes.

2. **Root Cause Analysis**: Suggest the 2–5 most likely root causes. For EACH cause, provide:
   - cause: Clear, specific description
   - confidence: A number from 0–1 reflecting likelihood
   - rationale: Detailed explanation citing specific telemetry deviations and engineering principles

3. **Recommended Fix**: Provide a numbered, step-by-step diagnostic and repair procedure. Include:
   - Specific components to check
   - Test procedures
   - Common failure modes
   - Repair or replacement steps
   - Post-repair verification steps

Be thorough, actionable, and cite specific values from the telemetry data.

Return STRICT JSON with keys: deviation_summary (string, 4-6 sentences with specific values), causes (array of {cause: string, confidence: number, rationale: string}), recommended_fix (string with numbered steps).`;
    
    const user = `DTC CODE: ${data.dtc_code}
VEHICLE: ${data.vehicle_id}

PRE-FAULT TELEMETRY TREND (10-30 minutes before fault):
${data.trend_summary}

VEHICLE HISTORY & PRIOR CASES:
${data.history ?? "No prior diagnostic history for this vehicle."}

INSTRUCTIONS:
- Analyze the telemetry data thoroughly for anomalies and deviations
- Consider the vehicle history and any patterns
- Provide detailed, actionable diagnostic steps
- Include specific component checks and test procedures
- Cite specific telemetry values in your analysis

Return ONLY valid JSON, no prose, no markdown, no explanations.`;
    
    console.log(`[v0] Starting comprehensive analysis for vehicle ${data.vehicle_id} with DTC ${data.dtc_code}`);
    const raw = await callOpenAI(system, user, 4);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      const result = JSON.parse(cleaned) as { deviation_summary: string; causes: {cause:string;confidence:number;rationale:string}[]; recommended_fix: string };
      console.log(`[v0] Analysis completed successfully for vehicle ${data.vehicle_id}. Found ${result.causes.length} possible causes.`);
      return result;
    } catch (e) {
      console.warn(`[v0] JSON parse failed, returning raw response. Error: ${e instanceof Error ? e.message : String(e)}`);
      return { deviation_summary: raw.slice(0, 500), causes: [], recommended_fix: "See deviation summary for raw AI response" };
    }
  });

export const draftReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data }) => {
    const system = `You are a senior diagnostic report writer for a commercial fleet workshop. Your task is to convert AI analysis into a detailed, actionable field report for technicians and integrators.

The field report must be COMPREHENSIVE and ACTIONABLE:

1. **Issue Summary**: Concise but complete description of the problem, what it affects, and why it matters.

2. **Evidence**: Detailed explanation of the telemetry deviations observed, with specific values and what they indicate.

3. **Recommended Fix**: Detailed step-by-step diagnostic and repair procedure that includes:
   - Safety precautions
   - Required tools and equipment
   - Specific components to inspect
   - Test procedures with expected values
   - Common failure modes to look for
   - Detailed repair/replacement steps
   - Post-repair verification and testing
   - When to escalate or contact OEM support

4. **History Notes**: Summary of any relevant prior cases or patterns.

Write for a skilled technician who may not be a specialist in this specific system. Be thorough, precise, and actionable.

Return STRICT JSON with keys: issue (2-3 sentences), evidence (3-5 sentences with specific telemetry values), recommended_fix (detailed numbered procedures with sub-steps), history_notes (2-3 sentences).`;
    
    const user = `DTC CODE: ${data.dtc_code}
VEHICLE ID: ${data.vehicle_id}

AI-DETECTED DEVIATION:
${data.deviation}

SUSPECTED ROOT CAUSES:
${data.causes}

VEHICLE DIAGNOSTIC HISTORY:
${data.history ?? "No prior cases recorded."}

TASK: Convert this analysis into a detailed field service report.
- Include all diagnostic steps needed to verify the root cause
- Provide specific component inspection procedures
- Include repair procedures with detailed steps
- Add verification and test procedures for after repairs
- Reference the telemetry deviations in your recommendations

Return ONLY valid JSON, no prose, no markdown, no explanations.`;
    
    console.log(`[v0] Generating detailed field report for DTC ${data.dtc_code}`);
    const raw = await callOpenAI(system, user);
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    try {
      const result = JSON.parse(cleaned) as { issue: string; evidence: string; recommended_fix: string; history_notes: string };
      console.log(`[v0] Field report generated successfully`);
      return result;
    } catch (e) {
      console.warn(`[v0] JSON parse failed for report, returning structured fallback. Error: ${e instanceof Error ? e.message : String(e)}`);
      return { 
        issue: raw.slice(0, 300), 
        evidence: data.deviation, 
        recommended_fix: `Based on suspected causes:\n${data.causes}\n\nFollow standard diagnostic procedures for this DTC code. See evidence section for telemetry details.`, 
        history_notes: data.history?.slice(0, 200) ?? "None" 
      };
    }
  });
