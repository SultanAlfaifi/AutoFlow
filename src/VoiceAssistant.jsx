import React from "react";
import { FileText, MessageSquareText, Mic, MicOff, RotateCcw, ShieldCheck, Square } from "lucide-react";
import { VOICE_STATUS_LABELS } from "./realtimeVoiceEvents.js";
import { useRealtimeVoiceAssistant } from "./useRealtimeVoiceAssistant.js";

export default function VoiceAssistant({
  conversationId,
  draft,
  metadata,
  account,
  conditionLabels,
  actionLabels,
  safetyLabels,
  onDraft,
  onReview,
  onReset,
}) {
  const voice = useRealtimeVoiceAssistant({ conversationId, draft, metadata, account, onDraft });
  const statusLabel = VOICE_STATUS_LABELS[voice.status] || VOICE_STATUS_LABELS.idle;
  const canStart = !voice.active && voice.availability.enabled && !voice.availability.loading;
  const hasConversation = voice.transcript.length > 0;

  const reset = () => {
    voice.stop();
    voice.clearTranscript();
    onReset();
  };
  const review = () => {
    voice.stop();
    if (draft) onReview(draft.id);
  };

  return <div className="voice-assistant voice-assistant--simple">
    <section className={`voice-simple-start voice-status--${voice.status}`} aria-label="المحادثة الصوتية">
      <small>تحدث مع مساعد AutoFlow</small>
      <h3>{voice.active ? statusLabel : "اضغط وتكلم"}</h3>
      <p>{voice.active ? "تكلم بطبيعتك، وتقدر تقاطع المساعد بأي وقت." : "قل مثلًا: إذا نزل راتبي، حوّل 10٪ للادخار."}</p>
      {!voice.active
        ? <button className="voice-simple-start__button" type="button" onClick={voice.start} disabled={!canStart} aria-label="بدء المحادثة الصوتية">
          <span><Mic /></span><strong>ابدأ المحادثة</strong>
        </button>
        : <div className="voice-simple-active">
          <div className="voice-status__orb" aria-hidden="true"><div className="voice-visualizer"><i /><i /><i /><i /><i /></div></div>
          <div className="voice-controls" role="group" aria-label="عناصر تحكم المحادثة الصوتية">
            <button type="button" onClick={voice.toggleMute} aria-label={voice.muted ? "تشغيل الميكروفون" : "كتم الميكروفون"} aria-pressed={voice.muted}>
              {voice.muted ? <MicOff /> : <Mic />} {voice.muted ? "تشغيل" : "كتم"}
            </button>
            <button className="voice-stop-button" type="button" onClick={voice.stop} aria-label="إيقاف المحادثة الصوتية"><Square /> إنهاء</button>
          </div>
        </div>}
      {!voice.availability.loading && !voice.availability.enabled && <div className="voice-setup-message" role="status">الصوت غير متاح في نسخة التجربة حاليًا.</div>}
      {voice.error && <div className="assistant-error voice-error" role="alert">{voice.error}</div>}
      <div className="voice-privacy-note"><ShieldCheck /><span>ينشئ مسودة للمراجعة فقط، ولا ينفذ أي عملية مالية.</span></div>
    </section>

    {hasConversation && <section className="voice-transcript-card" aria-label="سجل المحادثة">
      <header><span><MessageSquareText /></span><div><strong>المحادثة</strong><small>{voice.transcript.length ? `${voice.transcript.length} رسائل` : "ستظهر هنا تلقائيًا"}</small></div></header>
      <div className="voice-transcript" role="log" aria-live="polite" aria-label="النص المفرغ للمحادثة">
        {voice.transcript.map((message) => <div className={`voice-transcript__message voice-transcript__message--${message.role}`} key={message.id}>
          <small>{message.role === "user" ? "أنت" : "مساعد AutoFlow"}</small><span>{message.text}</span>
        </div>)}
      </div>
      <button className="voice-reset-button" type="button" onClick={reset} aria-label="مسح المحادثة والبدء من جديد"><RotateCcw /> محادثة جديدة</button>
    </section>}

    {draft && <aside className="voice-draft-preview" aria-label="المعاينة المباشرة لمسودة الأتمتة">
      <header><span><FileText /></span><div><small>معاينة مباشرة</small><h3>{draft?.name || "لم تُنشأ المسودة بعد"}</h3></div></header>
      {voice.lastDraftChange && <div className="voice-draft-change" role="status">{voice.lastDraftChange}</div>}
      <div><strong>تبدأ عندما</strong>{conditionLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
      <div><strong>ثم تنفذ</strong>{actionLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
      <div><strong>حدود الأمان</strong>{safetyLabels.length ? safetyLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>) : <span>لم تُحدد حدود أمان إضافية</span>}</div>
      <footer><span>غير مفعلة · تحتاج إلى مراجعتك</span><button type="button" onClick={review}>مراجعة الأتمتة</button></footer>
    </aside>}
  </div>;
}
