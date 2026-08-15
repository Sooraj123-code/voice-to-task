import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "GEMINI_API_KEY is not set. /api/extract-task will fail until it is configured.",
  );
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "voice-task-ai-api",
    timestamp: new Date().toISOString(),
  });
});

// Wait helper
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini request with retry for temporary 503/429 errors
async function generateTaskWithRetry(
  contents: string,
  config: any,
  maxRetries = 3,
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Gemini request attempt ${attempt + 1}/${maxRetries + 1}`,
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config,
      });

      return response;
    } catch (error: any) {
      const status = error?.status || error?.code;

      const isRetryable =
        status === 503 ||
        status === 429 ||
        error?.message?.includes("503") ||
        error?.message?.includes("429") ||
        error?.message?.includes("UNAVAILABLE") ||
        error?.message?.includes("RESOURCE_EXHAUSTED");

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = 2000 * Math.pow(2, attempt);

      console.log(
        `Gemini temporarily unavailable. Retrying in ${delay / 1000}s...`,
      );

      await sleep(delay);
    }
  }

  throw new Error("Gemini request failed after retries.");
}

app.post("/api/extract-task", async (req, res) => {
  try {
    const { text, referenceDate, timezone } = req.body as {
      text?: string;
      referenceDate?: string;
      timezone?: string;
    };

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing voice transcript.",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured on the backend.",
      });
    }

    const contextDate = referenceDate || new Date().toISOString();
    const contextTimezone = timezone || "UTC";

    const response = await generateTaskWithRetry(
      `Extract a task from this voice transcript: ${JSON.stringify(text)}`,
      {
        systemInstruction: `You are a task scheduling parser for a mobile productivity app.

Reference date/time: ${contextDate}
Timezone: ${contextTimezone}

Interpret relative dates such as today, tomorrow, next Monday, tonight, and in 2 hours relative to the reference context.

Return only structured JSON.

- taskTitle: concise actionable task without phrases such as "remind me to".
- date: YYYY-MM-DD.
- formattedDate: human-readable date.
- time: useful time string; if missing use "All Day".
- formattedTime: clean display time.
- status: Pending unless the user clearly says it is completed.
- priority: Low, Medium, High, or Urgent.
- category: Call, Meeting, Work, Personal, Reminder, Shopping, Health, or Other.
- notes: extra context or empty string.
- confidence: High, Medium, or Low.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            taskTitle: { type: Type.STRING },
            date: { type: Type.STRING },
            formattedDate: { type: Type.STRING },
            time: { type: Type.STRING },
            formattedTime: { type: Type.STRING },
            status: { type: Type.STRING },
            priority: { type: Type.STRING },
            category: { type: Type.STRING },
            notes: { type: Type.STRING },
            confidence: { type: Type.STRING },
          },
          required: [
            "taskTitle",
            "date",
            "formattedDate",
            "time",
            "formattedTime",
            "status",
            "priority",
            "category",
          ],
        },
      },
    );

    const data = JSON.parse(response.text || "{}");

    return res.json({
      success: true,
      data,
      rawSpeech: text,
      extractedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Task extraction failed:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "AI extraction failed.",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Voice Task AI backend listening on http://0.0.0.0:${PORT}`,
  );
});