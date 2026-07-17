import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { processAutomationDraftTool } from "../api/automation-draft.js";
import { createOrUpdateAutomationDraft } from "../server/automationDraftEngine.js";
import realtimeSessionHandler, { buildRealtimeSession, createRealtimeCall } from "../api/openai/realtime/session.js";
import { makeAction, makeCondition, makeManualWorkflow } from "../src/automationContract.js";
import { cleanupRealtimeResources, classifyVoiceError, inferNoiseReductionType } from "../src/useRealtimeVoiceAssistant.js";
import { reduceRealtimeTranscript, statusFromRealtimeEvent, summarizeDraftChanges } from "../src/realtimeVoiceEvents.js";

function completeCandidate(id = "model-draft") {
  const action = makeAction("save", "model-action");
  action.amountMode = "percent";
  action.value = "10";
  action.approval = { mode: "auto", threshold: "" };
  return {
    ...makeManualWorkflow(id),
    name: "ادخار الراتب",
    active: true,
    conditions: [makeCondition("salary", "and", "model-condition")],
    actions: [action],
  };
}

test("text and Realtime tools use the same trusted draft normalization", () => {
  const candidate = completeCandidate();
  const text = createOrUpdateAutomationDraft({ operation: "create", conversationId: "shared", candidate });
  const voice = processAutomationDraftTool({ operation: "create", conversation_id: "shared", draft: candidate, current_draft: null, current_metadata: null });
  assert.deepEqual(voice.automation, text.automation);
  assert.equal(voice.automation.active, false);
  assert.equal(voice.metadata.review_status, "needs_review");
  assert.equal(voice.metadata.generation_source, "ai");
});

test("the shared engine rejects unknown workflow fields", () => {
  assert.throws(
    () => createOrUpdateAutomationDraft({ operation: "create", conversationId: "strict", candidate: { ...completeCandidate(), sourceAccountId: "invented" } }),
    /بنية الأتمتة المطلوبة/,
  );
});

test("Realtime updates keep the existing workflow and step IDs", () => {
  const first = createOrUpdateAutomationDraft({ operation: "create", conversationId: "stable", candidate: completeCandidate() });
  const changed = completeCandidate("another-id");
  changed.name = "ادخار الراتب المعدل";
  changed.actions[0].value = "15";
  const second = createOrUpdateAutomationDraft({ operation: "update", conversationId: "stable", candidate: changed, currentDraft: first.automation, currentMetadata: first.metadata });
  assert.equal(second.automation.id, first.automation.id);
  assert.equal(second.automation.conditions[0].id, first.automation.conditions[0].id);
  assert.equal(second.automation.actions[0].id, first.automation.actions[0].id);
  assert.equal(second.automation.actions[0].value, "15");
});

test("invalid tool requests and invalid tool payloads are bounded", () => {
  assert.throws(() => processAutomationDraftTool({ operation: "create", conversation_id: "x", draft: completeCandidate(), injected: true }), /حقولًا غير معروفة/);
  assert.throws(() => processAutomationDraftTool({ operation: "update", conversation_id: "x", draft: completeCandidate(), current_draft: null, current_metadata: null }), /لا توجد مسودة/);
});

test("Realtime session uses WebRTC audio, semantic VAD, interruption, and the real workflow schema", () => {
  const previousModel = process.env.OPENAI_REALTIME_MODEL;
  const previousVoice = process.env.OPENAI_REALTIME_VOICE;
  delete process.env.OPENAI_REALTIME_MODEL;
  delete process.env.OPENAI_REALTIME_VOICE;
  try {
    const session = buildRealtimeSession({ conversation_id: "session-test", current_draft: null });
    assert.equal(session.type, "realtime");
    assert.equal(session.model, "gpt-realtime-2.1");
    assert.equal(session.audio.output.voice, "cedar");
    assert.equal(session.audio.output.speed, 0.95);
    assert.equal(session.audio.input.transcription.model, "gpt-4o-transcribe");
    assert.equal(session.audio.input.transcription.language, "ar");
    assert.equal(session.audio.input.noise_reduction.type, "far_field");
    assert.match(session.instructions, /لهجة سعودية بيضاء/);
    assert.equal(session.audio.input.turn_detection.type, "semantic_vad");
    assert.equal(session.audio.input.turn_detection.interrupt_response, true);
    assert.equal(session.tools[0].name, "create_or_update_automation_draft");
    assert.equal(session.tools[0].parameters.properties.draft.additionalProperties, false);
    assert.deepEqual(session.output_modalities, ["audio"]);
    assert.equal("metadata" in session, false);
  } finally {
    if (previousModel === undefined) delete process.env.OPENAI_REALTIME_MODEL; else process.env.OPENAI_REALTIME_MODEL = previousModel;
    if (previousVoice === undefined) delete process.env.OPENAI_REALTIME_VOICE; else process.env.OPENAI_REALTIME_VOICE = previousVoice;
  }
});

test("microphone profile selects the matching Realtime noise reduction", () => {
  assert.equal(inferNoiseReductionType({ label: "Microphone Array (Laptop)" }), "far_field");
  assert.equal(inferNoiseReductionType({ label: "USB Headset Microphone" }), "near_field");
  assert.equal(inferNoiseReductionType({ label: "سماعة البلوتوث" }), "near_field");
  assert.equal(buildRealtimeSession({ audio_input_profile: "near_field" }).audio.input.noise_reduction.type, "near_field");
});

test("unified WebRTC call sends SDP and session as multipart text fields", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key-not-sent-to-client";
  let captured;
  try {
    const result = await createRealtimeCall(
      { sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1", conversation_id: "multipart-test" },
      async (_url, options) => {
        captured = options;
        return {
          ok: true,
          headers: { get: () => null },
          text: async () => "v=0\r\no=- answer",
        };
      },
    );
    assert.equal(result.sdp, "v=0\r\no=- answer");
    assert.equal(typeof captured.body.get("sdp"), "string");
    assert.equal(typeof captured.body.get("session"), "string");
    assert.equal(JSON.parse(captured.body.get("session")).model, "gpt-realtime-2.1");
    assert.equal(captured.headers.Authorization, "Bearer test-key-not-sent-to-client");
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("missing OpenAI key returns an Arabic setup state without creating a session", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  let body = "";
  const response = { statusCode: 0, setHeader() {}, end(value) { body = value; } };
  try {
    await realtimeSessionHandler({ method: "GET" }, response);
    assert.equal(response.statusCode, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.enabled, false);
    assert.match(parsed.message, /غير مفعلة/);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous;
  }
});

test("transcript events update visible user and assistant messages only", () => {
  let transcript = [];
  transcript = reduceRealtimeTranscript(transcript, { type: "conversation.item.input_audio_transcription.delta", item_id: "u1", delta: "حوّل " });
  transcript = reduceRealtimeTranscript(transcript, { type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "حوّل 10% للادخار" });
  transcript = reduceRealtimeTranscript(transcript, { type: "response.output_audio_transcript.done", item_id: "a1", transcript: "تم، سأجهز مسودة للمراجعة." });
  transcript = reduceRealtimeTranscript(transcript, { type: "response.function_call_arguments.done", arguments: "{secret}" });
  assert.deepEqual(transcript.map(({ role, text }) => ({ role, text })), [
    { role: "user", text: "حوّل 10% للادخار" },
    { role: "assistant", text: "تم، سأجهز مسودة للمراجعة." },
  ]);
});

test("voice status events cover speaking, thinking, listening, and mute", () => {
  assert.equal(statusFromRealtimeEvent({ type: "input_audio_buffer.speech_started" }, "listening"), "user_speaking");
  assert.equal(statusFromRealtimeEvent({ type: "input_audio_buffer.speech_stopped" }, "user_speaking"), "thinking");
  assert.equal(statusFromRealtimeEvent({ type: "response.output_audio_transcript.delta" }, "thinking"), "assistant_speaking");
  assert.equal(statusFromRealtimeEvent({ type: "response.done" }, "assistant_speaking"), "listening");
  assert.equal(statusFromRealtimeEvent({ type: "response.done" }, "assistant_speaking", true), "muted");
});

test("cleanup closes WebRTC, data channel, audio, and every microphone track", () => {
  const calls = [];
  const track = { stop: () => calls.push("track") };
  cleanupRealtimeResources({
    stream: { getTracks: () => [track] },
    channel: { readyState: "open", close: () => calls.push("channel") },
    peer: { connectionState: "connected", getSenders: () => [{ track }], close: () => calls.push("peer") },
    audio: { pause: () => calls.push("audio"), srcObject: {}, removeAttribute() {} },
    abortController: { abort: () => calls.push("abort") },
  });
  assert.ok(calls.includes("abort"));
  assert.ok(calls.includes("channel"));
  assert.ok(calls.includes("peer"));
  assert.ok(calls.includes("track"));
  assert.ok(calls.includes("audio"));
});

test("microphone errors have safe Arabic messages", () => {
  assert.match(classifyVoiceError({ name: "NotAllowedError" }), /إذن الميكروفون/);
  assert.match(classifyVoiceError({ name: "NotFoundError" }), /ميكروفون/);
  assert.match(classifyVoiceError({ name: "NotReadableError" }), /تطبيق آخر/);
});

test("the VoiceAssistant starts with one simple voice action and a visible transcript area", async () => {
  const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  try {
    const { default: VoiceAssistant } = await server.ssrLoadModule("/src/VoiceAssistant.jsx");
    const html = renderToStaticMarkup(React.createElement(VoiceAssistant, {
      conversationId: "render",
      draft: null,
      metadata: null,
      account: null,
      conditionLabels: [],
      actionLabels: [],
      safetyLabels: [],
      onDraft() {},
      onReview() {},
      onReset() {},
      onUseText() {},
    }));
    assert.match(html, /تحدث مع مساعد AutoFlow/);
    assert.match(html, /ينشئ مسودة للمراجعة فقط/);
    assert.match(html, /aria-label="بدء المحادثة الصوتية"/);
    assert.match(html, /aria-label="النص المفرغ للمحادثة"/);
    assert.match(html, /نص المحادثة سيظهر هنا/);
    assert.doesNotMatch(html, /معاينة مباشرة/);
    assert.doesNotMatch(html, /OpenAI|API/);
  } finally {
    await server.close();
  }
});

test("the assistant UI keeps one shared draft while switching text and voice modes", () => {
  const source = fs.readFileSync(new URL("../src/AutoFlowStudio.jsx", import.meta.url), "utf8");
  assert.match(source, /useState\("text"\)/);
  assert.match(source, />كتابة</);
  assert.match(source, /<Mic \/> صوت/);
  assert.match(source, /draft=\{draft\}/);
  assert.match(source, /onDraft=\{acceptDraft\}/);
  assert.match(source, /onUseText=\{\(\) => setMode\("text"\)\}/);
  assert.match(source, /key=\{conversation\.conversation_id\}/);
  const hookSource = fs.readFileSync(new URL("../src/useRealtimeVoiceAssistant.js", import.meta.url), "utf8");
  assert.match(hookSource, /startInFlightRef\.current/);
});

test("the unavailable voice state and draft preview use simple user-facing copy", () => {
  const source = fs.readFileSync(new URL("../src/VoiceAssistant.jsx", import.meta.url), "utf8");
  assert.match(source, /الصوت غير متاح الآن/);
  assert.match(source, /اكتب طلبك بدلًا من ذلك/);
  assert.match(source, /مسودة جاهزة للمراجعة/);
  assert.match(source, /مراجعة وتعديل/);
  assert.doesNotMatch(source, />تبدأ عندما</);
  assert.doesNotMatch(source, />ثم تنفذ</);
  assert.doesNotMatch(source, />حدود الأمان</);
});

test("draft change summaries identify safety updates without exposing payloads", () => {
  const first = createOrUpdateAutomationDraft({ operation: "create", conversationId: "diff", candidate: completeCandidate() }).automation;
  const next = structuredClone(first);
  next.actions[0].safety.minBalanceOn = true;
  next.actions[0].safety.minBalance = "2000";
  assert.match(summarizeDraftChanges(first, next), /حدود الأمان/);
});
