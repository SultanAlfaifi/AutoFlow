import React from "react";
import { FileText, MessageSquareText, Mic, MicOff, RotateCcw, ShieldCheck, Square, Volume2 } from "lucide-react";
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

  const reset = () => {
    voice.stop();
    voice.clearTranscript();
    onReset();
  };
  const review = () => {
    voice.stop();
    if (draft) onReview(draft.id);
  };

  return <div className="voice-assistant">
    <div className="voice-assistant__intro">
      <span><Volume2 /></span>
      <div><h3>تحدث مع مساعد AutoFlow</h3><p>صف ما تريد بصوتك، وسيبني المساعد المسودة معك خطوة بخطوة.</p></div>
    </div>
    <div className="voice-privacy-note"><ShieldCheck /><span>يُستخدم الميكروفون لإنشاء المسودة فقط. لن يتم تنفيذ أي عملية مالية أو تفعيل أي أتمتة دون مراجعتك.</span></div>

    <section className="voice-conversation" aria-label="المحادثة الصوتية">
      <div className={`voice-status voice-status--${voice.status}`} aria-live="polite" aria-atomic="true">
        <div className="voice-status__orb" aria-hidden="true">
          <div className="voice-visualizer"><i /><i /><i /><i /><i /></div>
        </div>
        <div className="voice-status__copy">
          <small>حالة المحادثة</small>
          <strong>{statusLabel}</strong>
          <span>{voice.active ? "تحدث بشكل طبيعي، ويمكنك مقاطعة المساعد في أي وقت." : "اضغط بدء المحادثة عندما تكون جاهزًا."}</span>
        </div>
      </div>

      {!voice.availability.loading && !voice.availability.enabled && <div className="voice-setup-message" role="status">{voice.availability.message}</div>}
      {voice.error && <div className="assistant-error voice-error" role="alert">{voice.error}</div>}

      <div className="voice-controls" role="group" aria-label="عناصر تحكم المحادثة الصوتية">
        {!voice.active
          ? <button className="voice-primary-button" type="button" onClick={voice.start} disabled={!canStart} aria-label="بدء المحادثة الصوتية"><Mic /> بدء المحادثة</button>
          : <button className="voice-stop-button" type="button" onClick={voice.stop} aria-label="إيقاف المحادثة الصوتية"><Square /> إنهاء المحادثة</button>}
        <button type="button" onClick={voice.toggleMute} disabled={!voice.active} aria-label={voice.muted ? "تشغيل الميكروفون" : "كتم الميكروفون"} aria-pressed={voice.muted}>
          {voice.muted ? <MicOff /> : <Mic />} {voice.muted ? "تشغيل الصوت" : "كتم"}
        </button>
      </div>
    </section>

    <section className="voice-transcript-card" aria-label="سجل المحادثة">
      <header><span><MessageSquareText /></span><div><strong>المحادثة</strong><small>{voice.transcript.length ? `${voice.transcript.length} رسائل` : "ستظهر هنا تلقائيًا"}</small></div></header>
      <div className="voice-transcript" role="log" aria-live="polite" aria-label="النص المفرغ للمحادثة">
        {voice.transcript.length ? voice.transcript.map((message) => <div className={`voice-transcript__message voice-transcript__message--${message.role}`} key={message.id}>
          <small>{message.role === "user" ? "أنت" : "مساعد AutoFlow"}</small><span>{message.text}</span>
        </div>) : <div className="voice-transcript__empty"><MessageSquareText /><strong>ابدأ المحادثة بصوتك</strong><span>مثال: إذا نزل راتبي، حوّل 10% إلى الادخار.</span></div>}
      </div>
      <button className="voice-reset-button" type="button" onClick={reset} aria-label="مسح المحادثة والبدء من جديد"><RotateCcw /> محادثة جديدة</button>
    </section>

    <aside className="voice-draft-preview" aria-label="المعاينة المباشرة لمسودة الأتمتة">
      <header><span><FileText /></span><div><small>معاينة مباشرة</small><h3>{draft?.name || "لم تُنشأ المسودة بعد"}</h3></div></header>
        {draft ? <>
          {voice.lastDraftChange && <div className="voice-draft-change" role="status">{voice.lastDraftChange}</div>}
          <div><strong>تبدأ عندما</strong>{conditionLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
          <div><strong>ثم تنفذ</strong>{actionLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
          <div><strong>حدود الأمان</strong>{safetyLabels.length ? safetyLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>) : <span>لم تُحدد حدود أمان إضافية</span>}</div>
          <footer><span>غير مفعلة · تحتاج إلى مراجعتك</span><button type="button" onClick={review}>مراجعة الأتمتة</button></footer>
        </> : <p>بعد أن توضّح الحدث والمبلغ أو النسبة والوجهة، ستظهر تفاصيل الأتمتة هنا مباشرة.</p>}
    </aside>
  </div>;
}
