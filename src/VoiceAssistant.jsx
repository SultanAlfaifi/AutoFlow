import React, { useEffect, useRef } from "react";
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
  onUseText = () => {},
}) {
  const voice = useRealtimeVoiceAssistant({ conversationId, draft, metadata, account, onDraft });
  const statusLabel = VOICE_STATUS_LABELS[voice.status] || VOICE_STATUS_LABELS.idle;
  const canStart = !voice.active && voice.availability.enabled && !voice.availability.loading;
  const hasConversation = voice.transcript.length > 0;
  const voiceUnavailable = !voice.availability.loading && !voice.availability.enabled;
  const draftSummary = `${conditionLabels.join("، ") || "حدد وقت البدء"}، وبعدها ${actionLabels.join("، ") || "حدد ما الذي سينفذه AutoFlow"}.`;
  const transcriptRef = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = transcriptRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [voice.transcript, voice.status]);

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
    <section className={`voice-simple-start ${voiceUnavailable ? "voice-simple-start--unavailable" : ""} voice-status--${voice.status}`} aria-label="المحادثة الصوتية">
      {voiceUnavailable ? <>
        <span className="voice-unavailable-icon" aria-hidden="true"><MicOff /></span>
        <small>المحادثة الصوتية</small>
        <h3>الصوت غير متاح الآن</h3>
        <p>تقدر تكتب طلبك، وسينشئ AutoFlow لك نفس المسودة للمراجعة.</p>
        <button className="voice-use-text-button" type="button" onClick={onUseText}><MessageSquareText /> اكتب طلبك بدلًا من ذلك</button>
      </> : <>
        <small>تحدث مع مساعد AutoFlow</small>
        <h3>{voice.active ? statusLabel : voice.availability.loading ? "جاري تجهيز الصوت…" : "اضغط وتكلم"}</h3>
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
      </>}
      {voice.error && <div className="assistant-error voice-error" role="alert">{voice.error}</div>}
      <div className="voice-privacy-note"><ShieldCheck /><span>ينشئ مسودة للمراجعة فقط، ولا ينفذ أي عملية مالية.</span></div>
    </section>

    <section className="voice-transcript-card" aria-label="سجل المحادثة">
      <header><span><MessageSquareText /></span><div><strong>المحادثة</strong><small>{voice.transcript.length ? `${voice.transcript.length} رسائل` : "ستظهر هنا تلقائيًا"}</small></div></header>
      <div className="voice-transcript" role="log" aria-live="polite" aria-label="النص المفرغ للمحادثة" ref={transcriptRef}>
        {hasConversation
          ? voice.transcript.map((message) => <div className={`voice-transcript__message voice-transcript__message--${message.role}`} key={message.id}>
            <small>{message.role === "user" ? "أنت" : "مساعد AutoFlow"}</small><span>{message.text}</span>
          </div>)
          : <div className="voice-transcript__empty"><MessageSquareText /><strong>نص المحادثة سيظهر هنا</strong><span>ابدأ المحادثة، وستشاهد كلامك ورد المساعد مكتوبًا مباشرة.</span></div>}
      </div>
      {hasConversation && <button className="voice-reset-button" type="button" onClick={reset} aria-label="مسح المحادثة والبدء من جديد"><RotateCcw /> محادثة جديدة</button>}
    </section>

    {draft && <aside className="voice-draft-preview voice-draft-preview--simple" aria-label="ملخص مسودة الأتمتة">
      <header><span><FileText /></span><div><small>مسودة جاهزة للمراجعة</small><h3>{draft?.name || "مسودة أتمتة جديدة"}</h3></div></header>
      {voice.lastDraftChange && <div className="voice-draft-change" role="status">{voice.lastDraftChange}</div>}
      <p className="voice-draft-summary">{draftSummary}</p>
      {safetyLabels.length > 0 && <div className="voice-draft-safety"><ShieldCheck /><span>{safetyLabels.join("، ")}</span></div>}
      <footer><span>لن تُفعّل قبل مراجعتك</span><button type="button" onClick={review}>مراجعة وتعديل</button></footer>
    </aside>}
  </div>;
}
