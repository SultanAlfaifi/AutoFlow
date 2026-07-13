import { createOrUpdateAutomationDraft } from "../server/automationDraftEngine.js";

const MAX_BODY_BYTES = 96 * 1024;
const BODY_KEYS = new Set(["operation", "conversation_id", "draft", "current_draft", "current_metadata"]);

async function readRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
      const error = new Error("حجم الطلب أكبر من الحد المسموح.");
      error.statusCode = 413;
      throw error;
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export function processAutomationDraftTool(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    const error = new Error("طلب أداة المسودة غير صالح.");
    error.statusCode = 400;
    throw error;
  }
  const unknownKeys = Object.keys(payload).filter((key) => !BODY_KEYS.has(key));
  if (unknownKeys.length) {
    const error = new Error("طلب أداة المسودة يحتوي حقولًا غير معروفة.");
    error.statusCode = 400;
    error.details = unknownKeys.map((key) => ({ path: key, code: "unknown_field" }));
    throw error;
  }
  return createOrUpdateAutomationDraft({
    operation: payload.operation,
    conversationId: payload.conversation_id,
    candidate: payload.draft,
    currentDraft: payload.current_draft,
    currentMetadata: payload.current_metadata,
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    sendJson(response, 200, processAutomationDraftTool(await readRequestBody(request)));
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : "تعذر التحقق من مسودة الأتمتة.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}
