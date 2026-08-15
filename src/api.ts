import { ExtractedTaskData } from "./types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.163.74.215:3000";

export function getApiBaseUrl() {
  return API_BASE_URL.replace(/\/$/, "");
}

export async function extractTaskFromTranscript(
  text: string,
): Promise<ExtractedTaskData> {
  const response = await fetch(`${getApiBaseUrl()}/api/extract-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      referenceDate: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(body.error || `Server error: ${response.status}`);
  }
  return body.data as ExtractedTaskData;
}

export async function checkBackend() {
  const response = await fetch(`${getApiBaseUrl()}/api/health`);
  return response.ok;
}
