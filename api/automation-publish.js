import {
  SANDBOX_BENEFICIARIES,
  authorizeAiDraftPublication,
} from "../src/automationContract.js";

const MAX_BODY_BYTES = 64 * 1024;

function allowedBeneficiaries(payload) {
  const supplied = Array.isArray(payload?.beneficiaries) ? payload.beneficiaries : [];
  const merged = [...SANDBOX_BENEFICIARIES, ...supplied.flatMap((beneficiary) => {
    if (!beneficiary || typeof beneficiary !== "object") return [];
    const id = String(beneficiary.id || "").trim().slice(0, 100);
    const name = String(beneficiary.name || "").trim().slice(0, 100);
    const kind = beneficiary.kind === "internal" ? "internal" : "beneficiary";
    return id && name && name !== "مستفيد بنكي" ? [{ id, name, kind }] : [];
  })];
  return [...new Map(merged.map((beneficiary) => [beneficiary.id, beneficiary])).values()].slice(0, 50);
}

async function readRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw Object.assign(new Error("حجم الطلب أكبر من الحد المسموح"), { statusCode: 413 });
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export function publishAiDraft(payload, now = new Date().toISOString()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, statusCode: 400, error: "جسم الطلب غير صالح" };
  if (payload.operation !== "publish_ai_draft") return { ok: false, statusCode: 403, error: "عملية النشر غير مسموحة من هذا المسار" };
  if (payload.source !== "editor") return { ok: false, statusCode: 403, error: "لا يمكن نشر الأتمتة من مساعد المحادثة" };
  const result = authorizeAiDraftPublication(
    payload.automation,
    payload.metadata,
    payload.manual_review_confirmed,
    { beneficiaries: allowedBeneficiaries(payload), now },
  );
  if (!result.ok) return { ok: false, statusCode: 422, error: "لم تجتز المسودة التحقق المطلوب قبل النشر", issues: result.issues };
  return { ok: true, statusCode: 200, automation: result.automation, metadata: result.metadata };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const result = publishAiDraft(await readRequestBody(request));
    if (!result.ok) {
      sendJson(response, result.statusCode, { error: result.error, ...(result.issues ? { issues: result.issues } : {}) });
      return;
    }
    sendJson(response, 200, { automation: result.automation, metadata: result.metadata });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "تعذر نشر المسودة" });
  }
}
