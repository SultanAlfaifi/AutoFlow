import {
  AUTOMATION_SCHEMA_VERSION,
  SANDBOX_BENEFICIARIES,
  createAiMetadata,
  normalizeAssistantAutomation,
  validateAutomation,
} from "../src/automationContract.js";

const OPERATIONS = new Set(["create", "update"]);

function draftError(message, statusCode = 422, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function safeCandidate(candidate, currentDraft) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw draftError("استجابة المساعد لم تطابق بنية الأتمتة المطلوبة.", 422, [{ path: "draft", code: "invalid_type" }]);
  }
  return {
    ...candidate,
    active: false,
    runs: currentDraft?.runs || 0,
  };
}

/**
 * Trusted shared draft engine for both Responses API text requests and Realtime tool calls.
 * AI review metadata deliberately stays outside the workflow object because the existing
 * editor schema rejects unknown workflow fields.
 */
export function createOrUpdateAutomationDraft({
  operation = "create",
  conversationId,
  candidate,
  currentDraft = null,
  currentMetadata = null,
  beneficiaries = SANDBOX_BENEFICIARIES,
  now = new Date().toISOString(),
}) {
  const resolvedOperation = currentDraft ? "update" : operation;
  if (!OPERATIONS.has(resolvedOperation)) {
    throw draftError("عملية تحديث المسودة غير صالحة.", 400, [{ path: "operation", code: "invalid_enum" }]);
  }
  if (operation === "update" && !currentDraft) {
    throw draftError("لا توجد مسودة حالية لتحديثها.", 409, [{ path: "current_draft", code: "required" }]);
  }

  const securedCandidate = safeCandidate(candidate, currentDraft);
  const candidateIssues = validateAutomation(securedCandidate, {
    source: "ai",
    beneficiaries,
    requireZeroRuns: !currentDraft,
  });
  if (candidateIssues.length) {
    throw draftError(
      "استجابة المساعد لم تطابق بنية الأتمتة المطلوبة.",
      422,
      candidateIssues.map(({ path, code, message }) => ({ path, code, message })),
    );
  }

  const automation = normalizeAssistantAutomation(securedCandidate, conversationId, currentDraft);
  const normalizedIssues = validateAutomation(automation, {
    source: "ai",
    beneficiaries,
    requireZeroRuns: !currentDraft,
  });
  if (normalizedIssues.length) {
    throw draftError(
      "المسودة بعد التطبيع لم تجتز تحقق AutoFlow.",
      422,
      normalizedIssues.map(({ path, code, message }) => ({ path, code, message })),
    );
  }

  const metadata = createAiMetadata(currentMetadata, now);
  return {
    operation: resolvedOperation,
    automation,
    metadata,
    schema_version: AUTOMATION_SCHEMA_VERSION,
    security: {
      active: false,
      generation_source: metadata.generation_source,
      review_status: metadata.review_status,
    },
  };
}

export function validateAutomationDraft(candidate, options = {}) {
  return validateAutomation(candidate, {
    source: "ai",
    beneficiaries: options.beneficiaries || SANDBOX_BENEFICIARIES,
    requireZeroRuns: options.requireZeroRuns,
  });
}
