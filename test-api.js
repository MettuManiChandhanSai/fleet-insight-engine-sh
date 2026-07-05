import OpenAI from "openai";
import * as fs from "fs";

// Load .env file
const envContent = fs.readFileSync(".env", "utf-8");
const apiKey = envContent.match(/OPENAI_API_KEY="(.+?)"/)?.[1];

if (!apiKey) {
  console.error("❌ No API key found in .env file");
  process.exit(1);
}

console.log("[Test] API Key loaded. Testing connection...");
console.log("[Test] Key format:", apiKey.substring(0, 15) + "...");

const openai = new OpenAI({ apiKey });

(async () => {
  try {
    console.log("[Test] Calling OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Say 'API key is valid' if you can read this.",
        },
      ],
      max_tokens: 10,
    });

    console.log("✅ SUCCESS! API key is valid");
    console.log("[Test] Response:", response.choices[0]?.message?.content);
    process.exit(0);
  } catch (error) {
    console.error("❌ API Error:", error.message);
    if (error.status) {
      console.error("[Test] Status code:", error.status);
    }
    if (error.error?.message) {
      console.error("[Test] Error details:", error.error.message);
    }
    process.exit(1);
  }
})();
