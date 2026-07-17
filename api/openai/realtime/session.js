import { AUTOMATION_JSON_SCHEMA } from "../../../src/automationContract.js";
import { buildRealtimeAssistantInstructions } from "../../../server/realtimePrompt.js";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const MAX_BODY_BYTES = 192 * 1024;
const MAX_SDP_LENGTH = 96 * 1024;
const SUPPORTED_VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"]);
const SUPPORTED_TRANSCRIPTION_MODELS = new Set(["gpt-4o-transcribe", "gpt-4o-mini-transcribe"]);
const SUPPORTED_NOISE_REDUCTION = new Set(["near_field", "far_field"]);

async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
      const error = new Error("حجم طلب الاتصال أكبر من الحد المسموح.");
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

function safeConversationId(value) {
  return String(value || "voice").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "voice";
}

export function buildRealtimeSession(payload = {}) {
  const voice = process.env.OPENAI_REALTIME_VOICE || "cedar";
  if (!SUPPORTED_VOICES.has(voice)) {
    const error = new Error("صوت Realtime المضبوط غير مدعوم.");
    error.statusCode = 500;
    throw error;
  }
  const transcriptionModel = process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "gpt-4o-transcribe";
  if (!SUPPORTED_TRANSCRIPTION_MODELS.has(transcriptionModel)) {
    const error = new Error("نموذج تفريغ الصوت المضبوط غير مدعوم.");
    error.statusCode = 500;
    throw error;
  }
  const requestedNoiseReduction = payload.audio_input_profile || process.env.OPENAI_REALTIME_NOISE_REDUCTION || "far_field";
  const noiseReduction = SUPPORTED_NOISE_REDUCTION.has(requestedNoiseReduction) ? requestedNoiseReduction : "far_field";
  const conversationId = safeConversationId(payload.conversation_id);
  return {
    type: "realtime",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
    output_modalities: ["audio"],
    instructions: buildRealtimeAssistantInstructions({ currentDraft: payload.current_draft, account: payload.account, beneficiaries: payload.beneficiaries }),
    max_output_tokens: 700,
    audio: {
      input: {
        noise_reduction: { type: noiseReduction },
        transcription: {
          model: transcriptionModel,
          language: "ar",
          prompt: "المتحدث يستخدم العربية واللهجة السعودية البيضاء وقد يمزج مصطلحات إنجليزية. السياق أتمتة مالية: راتب، نزل الراتب، حوّل، تحويل، ادخار، حساب التوفير، فاتورة، مستفيد، رصيد، حد أدنى، حد أعلى، ريال، نسبة، بالمئة، عشرة بالمئة، ألف، ألفين، شهري، أسبوعي، approval، automation، AutoFlow. اكتب الأرقام والمبالغ والنسب بوضوح ولا تستبدلها بكلمات متشابهة.",
        },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low",
          create_response: false,
          interrupt_response: true,
        },
      },
      output: { voice, speed: 0.95 },
    },
    tool_choice: "auto",
    tools: [{
      type: "function",
      name: "create_or_update_automation_draft",
      description: "Create or update the one current AutoFlow draft after all essential values are confirmed. This never publishes, activates, or executes it.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          operation: { type: "string", enum: ["create", "update"] },
          draft: AUTOMATION_JSON_SCHEMA,
        },
        required: ["operation", "draft"],
      },
    }],
  };
}

export async function createRealtimeCall(payload, fetchImpl = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("المحادثة الصوتية غير مفعلة حاليًا. أضف مفتاح OpenAI في إعدادات الخادم لتشغيلها.");
    error.statusCode = 503;
    error.code = "openai_key_missing";
    throw error;
  }
  const sdp = String(payload.sdp || "");
  if (!sdp.startsWith("v=0") || sdp.length > MAX_SDP_LENGTH) {
    const error = new Error("طلب WebRTC غير صالح.");
    error.statusCode = 400;
    throw error;
  }

  const form = new FormData();
  // The unified Realtime interface expects two multipart text fields. Sending
  // either value as a file part makes the upstream request fail validation.
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(buildRealtimeSession(payload)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetchImpl(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!upstream.ok) {
      const requestId = upstream.headers.get("x-request-id") || "unavailable";
      const upstreamBody = await upstream.json().catch(() => ({}));
      const upstreamError = upstreamBody?.error || {};
      console.error("AutoFlow Realtime call failed", {
        status: upstream.status,
        requestId,
        code: upstreamError.code || "unavailable",
        param: upstreamError.param || "unavailable",
        message: upstreamError.message || "unavailable",
      });
      const error = new Error(upstream.status === 400 || upstream.status === 404
        ? "نموذج المحادثة الصوتية غير متاح أو إعداداته غير صالحة."
        : "تعذر الاتصال بالمساعد الصوتي. حاول مرة أخرى.");
      error.statusCode = upstream.status === 400 || upstream.status === 404 ? 503 : 502;
      error.code = "realtime_upstream_failed";
      throw error;
    }
    return { sdp: await upstream.text(), location: upstream.headers.get("location") };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("استغرق الاتصال بالمساعد وقتًا أطول من المتوقع.");
      timeoutError.statusCode = 504;
      timeoutError.code = "realtime_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const enabled = Boolean(process.env.OPENAI_API_KEY);
    sendJson(response, 200, {
      enabled,
      message: enabled ? "المحادثة الصوتية جاهزة." : "المحادثة الصوتية غير مفعلة حاليًا. أضف مفتاح OpenAI في إعدادات الخادم لتشغيلها.",
    });
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const result = await createRealtimeCall(await readJson(request));
    response.statusCode = 201;
    response.setHeader("Content-Type", "application/sdp");
    response.setHeader("Cache-Control", "no-store");
    if (result.location) response.setHeader("X-Realtime-Call", result.location.split("/").pop());
    response.end(result.sdp);
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.code
        ? error.message
        : error.statusCode && error.statusCode < 500
        ? error.message
        : "تعذر تشغيل المحادثة الصوتية.",
      ...(error.code ? { code: error.code } : {}),
    });
  }
}
