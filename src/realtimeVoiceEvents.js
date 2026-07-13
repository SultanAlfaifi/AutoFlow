export const VOICE_STATUS_LABELS = Object.freeze({
  idle: "جاهز للاستماع",
  requesting_permission: "نطلب إذن الميكروفون",
  connecting: "جاري الاتصال...",
  listening: "أستمع إليك",
  user_speaking: "أنت تتحدث الآن",
  thinking: "المساعد يفكر",
  assistant_speaking: "المساعد يتحدث",
  muted: "الميكروفون مكتوم",
  disconnected: "انقطع الاتصال",
  error: "تعذر تشغيل المحادثة الصوتية",
});

function upsertTranscript(items, entry, append = false) {
  const existingIndex = items.findIndex((item) => item.id === entry.id);
  if (existingIndex < 0) return [...items, entry].slice(-40);
  const next = [...items];
  const previous = next[existingIndex];
  next[existingIndex] = {
    ...previous,
    ...entry,
    text: append ? `${previous.text || ""}${entry.text || ""}` : entry.text,
  };
  return next;
}

export function reduceRealtimeTranscript(items, event) {
  if (!event || typeof event !== "object") return items;
  if (event.type === "conversation.item.input_audio_transcription.delta" && event.delta) {
    return upsertTranscript(items, { id: `user-${event.item_id}`, role: "user", text: event.delta, final: false }, true);
  }
  if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
    return upsertTranscript(items, { id: `user-${event.item_id}`, role: "user", text: event.transcript, final: true });
  }
  if (event.type === "response.output_audio_transcript.delta" && event.delta) {
    return upsertTranscript(items, { id: `assistant-${event.item_id}`, role: "assistant", text: event.delta, final: false }, true);
  }
  if (event.type === "response.output_audio_transcript.done" && event.transcript) {
    return upsertTranscript(items, { id: `assistant-${event.item_id}`, role: "assistant", text: event.transcript, final: true });
  }
  return items;
}

export function statusFromRealtimeEvent(event, currentStatus, muted = false) {
  if (muted) return "muted";
  switch (event?.type) {
    case "input_audio_buffer.speech_started": return "user_speaking";
    case "input_audio_buffer.speech_stopped":
    case "response.created": return "thinking";
    case "response.output_audio_transcript.delta":
    case "output_audio_buffer.started": return "assistant_speaking";
    case "output_audio_buffer.stopped":
    case "response.done": return "listening";
    default: return currentStatus;
  }
}

export function summarizeDraftChanges(previous, next) {
  if (!previous) return "أُنشئت مسودة الأتمتة وأصبحت جاهزة للمراجعة.";
  const changes = [];
  if (previous.name !== next.name) changes.push("الاسم");
  if (previous.match !== next.match || JSON.stringify(previous.conditions) !== JSON.stringify(next.conditions)) changes.push("الشروط");
  if (JSON.stringify(previous.actions?.map(({ safety, ...action }) => action)) !== JSON.stringify(next.actions?.map(({ safety, ...action }) => action))) changes.push("الإجراءات");
  if (JSON.stringify(previous.actions?.map((action) => action.safety)) !== JSON.stringify(next.actions?.map((action) => action.safety))) changes.push("حدود الأمان");
  return changes.length ? `تم تحديث ${changes.join(" و")}.` : "تم تأكيد المسودة الحالية دون تغييرات إضافية.";
}

