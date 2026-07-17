import { useCallback, useEffect, useRef, useState } from "react";
import { reduceRealtimeTranscript, statusFromRealtimeEvent, summarizeDraftChanges } from "./realtimeVoiceEvents.js";

const SESSION_ENDPOINT = "/api/openai/realtime/session";
const DRAFT_ENDPOINT = "/api/automation-draft";

function sendEvent(channel, event) {
  if (channel?.readyState === "open") channel.send(JSON.stringify(event));
}

export function inferNoiseReductionType(track) {
  const label = String(track?.label || "").toLocaleLowerCase();
  return /headset|headphone|earbud|airpods|bluetooth|سماعة/.test(label) ? "near_field" : "far_field";
}

export function classifyVoiceError(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "نحتاج إذن الميكروفون لبدء المحادثة.";
  if (error?.name === "NotFoundError") return "لم نعثر على ميكروفون متاح على هذا الجهاز.";
  if (error?.name === "NotReadableError" || error?.name === "AbortError") return "تعذر الوصول إلى الميكروفون. تحقق من أنه غير مستخدم في تطبيق آخر.";
  if (error?.code === "unsupported_browser") return "متصفحك لا يدعم المحادثة الصوتية عبر WebRTC.";
  return error?.message && !/OpenAI|SDP|WebRTC|RTC/i.test(error.message)
    ? error.message
    : "تعذر الاتصال بالمساعد الصوتي. حاول مرة أخرى.";
}

export function cleanupRealtimeResources(resources = {}) {
  if (resources.connectionTimer) clearTimeout(resources.connectionTimer);
  if (resources.disconnectTimer) clearTimeout(resources.disconnectTimer);
  if (resources.responseTimer) clearTimeout(resources.responseTimer);
  resources.abortController?.abort?.();
  if (resources.channel) {
    resources.channel.onopen = null;
    resources.channel.onmessage = null;
    resources.channel.onclose = null;
    resources.channel.onerror = null;
    if (resources.channel.readyState !== "closed") resources.channel.close();
  }
  if (resources.peer) {
    resources.peer.ontrack = null;
    resources.peer.onconnectionstatechange = null;
    resources.peer.getSenders?.().forEach((sender) => sender.track?.stop?.());
    if (resources.peer.connectionState !== "closed") resources.peer.close();
  }
  resources.stream?.getTracks?.().forEach((track) => track.stop());
  if (resources.audio) {
    resources.audio.pause?.();
    resources.audio.srcObject = null;
    resources.audio.removeAttribute?.("src");
  }
}

export function useRealtimeVoiceAssistant({ conversationId, draft, metadata, account, beneficiaries = [], onDraft }) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [lastDraftChange, setLastDraftChange] = useState("");
  const [availability, setAvailability] = useState({ loading: true, enabled: false, message: "جاري التحقق من إعداد الصوت..." });
  const resourcesRef = useRef(/** @type {any} */ ({}));
  const generationRef = useRef(0);
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  const draftRef = useRef(draft);
  const metadataRef = useRef(metadata);
  const onDraftRef = useRef(onDraft);
  const handledCallsRef = useRef(new Set());
  const startInFlightRef = useRef(false);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { metadataRef.current = metadata; }, [metadata]);
  useEffect(() => { onDraftRef.current = onDraft; }, [onDraft]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(SESSION_ENDPOINT, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "تعذر التحقق من إعداد الصوت.");
        setAvailability({ loading: false, enabled: Boolean(body.enabled), message: body.message || "" });
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setAvailability({ loading: false, enabled: false, message: "تعذر التحقق من إعداد المحادثة الصوتية." });
      });
    return () => controller.abort();
  }, []);

  const release = useCallback((nextStatus = "idle") => {
    generationRef.current += 1;
    startInFlightRef.current = false;
    cleanupRealtimeResources(resourcesRef.current);
    resourcesRef.current = {};
    setMuted(false);
    setStatus(nextStatus);
  }, []);

  useEffect(() => () => {
    generationRef.current += 1;
    startInFlightRef.current = false;
    cleanupRealtimeResources(resourcesRef.current);
    resourcesRef.current = {};
  }, []);

  const handleToolCall = useCallback(async (event, channel, generation) => {
    if (event.name !== "create_or_update_automation_draft" || !event.call_id) return;
    const fingerprint = `${event.call_id}:${event.arguments}`;
    if (handledCallsRef.current.has(fingerprint)) return;
    handledCallsRef.current.add(fingerprint);
    if (handledCallsRef.current.size > 30) handledCallsRef.current = new Set([fingerprint]);
    setStatus("thinking");
    try {
      const args = JSON.parse(event.arguments || "{}");
      const response = await fetch(DRAFT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: args.operation,
          conversation_id: conversationId,
          draft: args.draft,
          current_draft: draftRef.current,
          current_metadata: metadataRef.current,
          beneficiaries: beneficiaries.map(({ id, name, kind }) => ({ id, name, kind })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "استجابة المساعد لم تطابق بنية الأتمتة المطلوبة.");
      if (!result.automation || !result.metadata) throw new Error("وصلت استجابة غير مكتملة من المساعد. حاول مرة أخرى.");
      if (generation !== generationRef.current) return;
      const changeSummary = summarizeDraftChanges(draftRef.current, result.automation);
      draftRef.current = result.automation;
      metadataRef.current = result.metadata;
      setLastDraftChange(changeSummary);
      onDraftRef.current?.(result.automation, result.metadata);
      sendEvent(channel, {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: event.call_id, output: JSON.stringify({ ok: true, message: changeSummary, review_required: true }) },
      });
      sendEvent(channel, { type: "response.create" });
    } catch (toolError) {
      if (generation !== generationRef.current) return;
      const message = classifyVoiceError(toolError);
      setError(message);
      sendEvent(channel, {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: event.call_id, output: JSON.stringify({ ok: false, error: "المسودة لم تجتز تحقق AutoFlow. صحح المعلومات ولا تكرر نفس الاستدعاء." }) },
      });
      sendEvent(channel, { type: "response.create" });
    }
  }, [beneficiaries, conversationId]);

  const handleServerEvent = useCallback((event, channel, generation) => {
    if (generation !== generationRef.current) return;
    setTranscript((items) => reduceRealtimeTranscript(items, event));
    const nextStatus = statusFromRealtimeEvent(event, statusRef.current, mutedRef.current);
    if (nextStatus !== statusRef.current) setStatus(nextStatus);

    if (event.type === "input_audio_buffer.speech_started") {
      const resources = resourcesRef.current;
      if (resources.responseTimer) {
        clearTimeout(resources.responseTimer);
        resources.responseTimer = null;
      }
      if (["assistant_speaking", "thinking"].includes(statusRef.current)) {
        sendEvent(channel, { type: "response.cancel" });
        sendEvent(channel, { type: "output_audio_buffer.clear" });
      }
    }
    if (event.type === "input_audio_buffer.speech_stopped") {
      const resources = resourcesRef.current;
      if (resources.responseTimer) clearTimeout(resources.responseTimer);
      resources.responseTimer = setTimeout(() => {
        resources.responseTimer = null;
        if (generation === generationRef.current && !mutedRef.current) {
          sendEvent(channel, { type: "response.create" });
        }
      }, 1200);
    }
    if (event.type === "response.function_call_arguments.done") {
      void handleToolCall(event, channel, generation);
    }
    if (event.type === "conversation.item.input_audio_transcription.failed") {
      setError("تعذر تفريغ جزء من كلامك، ويمكنك تكراره بصوت واضح.");
    }
    if (event.type === "error" && event.error?.code !== "response_cancel_not_active") {
      setError("حدث خطأ مؤقت أثناء المحادثة الصوتية.");
    }
  }, [handleToolCall]);

  const start = useCallback(async () => {
    if (startInFlightRef.current || resourcesRef.current.peer || ["requesting_permission", "connecting", "listening", "user_speaking", "thinking", "assistant_speaking", "muted"].includes(statusRef.current)) return;
    setError("");
    setLastDraftChange("");
    if (!availability.enabled) {
      setError(availability.message || "المحادثة الصوتية غير مفعلة حاليًا.");
      return;
    }
    if (!globalThis.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      const unsupported = new Error("unsupported");
      unsupported.code = "unsupported_browser";
      setError(classifyVoiceError(unsupported));
      setStatus("error");
      return;
    }

    // React state is asynchronous. This synchronous lock prevents rapid taps
    // from creating several microphone permissions and Realtime calls at once.
    startInFlightRef.current = true;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const resources = /** @type {any} */ ({});
    resourcesRef.current = resources;
    try {
      setStatus("requesting_permission");
      resources.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
        },
      });
      resources.audioInputProfile = inferNoiseReductionType(resources.stream.getAudioTracks?.()[0]);
      if (generation !== generationRef.current) {
        cleanupRealtimeResources(resources);
        return;
      }
      setStatus("connecting");
      resources.peer = new RTCPeerConnection();
      resources.audio = new Audio();
      resources.audio.autoplay = true;
      resources.peer.ontrack = (trackEvent) => {
        resources.audio.srcObject = trackEvent.streams[0];
        void resources.audio.play().catch(() => setError("تعذر تشغيل صوت المساعد. تحقق من إعدادات تشغيل الصوت في المتصفح."));
      };
      resources.stream.getTracks().forEach((track) => resources.peer.addTrack(track, resources.stream));
      resources.channel = resources.peer.createDataChannel("oai-events");
      resources.channel.onmessage = (messageEvent) => {
        try { handleServerEvent(JSON.parse(messageEvent.data), resources.channel, generation); } catch { /* Ignore malformed transport events. */ }
      };
      resources.channel.onopen = () => {
        if (generation !== generationRef.current) return;
        if (resources.connectionTimer) clearTimeout(resources.connectionTimer);
        setStatus(mutedRef.current ? "muted" : "listening");
        sendEvent(resources.channel, {
          type: "response.create",
          response: { instructions: "رحّب بالمستخدم بلهجة سعودية بيضاء في جملة قصيرة وبصوت هادئ، ثم اطلب منه وصف الأتمتة التي يبيها." },
        });
      };
      resources.channel.onclose = () => {
        if (generation === generationRef.current && statusRef.current !== "idle") {
          setError("انقطع الاتصال، لكن مسودة الأتمتة ما زالت محفوظة.");
          release("disconnected");
        }
      };
      resources.channel.onerror = () => {
        setError("تعذر الاتصال بالمساعد الصوتي. حاول مرة أخرى.");
      };
      resources.peer.onconnectionstatechange = () => {
        if (generation !== generationRef.current) return;
        const connectionState = resources.peer.connectionState;
        if (connectionState === "connected") {
          if (resources.disconnectTimer) clearTimeout(resources.disconnectTimer);
          resources.disconnectTimer = null;
          if (statusRef.current === "connecting") setStatus(mutedRef.current ? "muted" : "listening");
          return;
        }
        if (["failed", "closed"].includes(connectionState)) {
          setError("انقطع الاتصال، لكن مسودة الأتمتة ما زالت محفوظة.");
          release("disconnected");
          return;
        }
        if (connectionState === "disconnected" && !resources.disconnectTimer) {
          // `disconnected` can be a brief network transition. Give WebRTC a
          // chance to recover before tearing down the microphone and session.
          setStatus("connecting");
          resources.disconnectTimer = setTimeout(() => {
            resources.disconnectTimer = null;
            if (generation !== generationRef.current) return;
            if (["disconnected", "failed"].includes(resources.peer?.connectionState)) {
              setError("انقطع الاتصال، لكن مسودة الأتمتة ما زالت محفوظة.");
              release("disconnected");
            }
          }, 5000);
        }
      };

      const offer = await resources.peer.createOffer();
      await resources.peer.setLocalDescription(offer);
      if (generation !== generationRef.current) {
        cleanupRealtimeResources(resources);
        return;
      }
      resources.abortController = new AbortController();
      const response = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/sdp, application/json" },
        body: JSON.stringify({
          sdp: offer.sdp,
          conversation_id: conversationId,
          current_draft: draftRef.current,
          audio_input_profile: resources.audioInputProfile,
          account: account ? { id: account.id, name: account.name, type: account.type, currency: account.currency } : null,
          beneficiaries: beneficiaries.map(({ id, name, kind }) => ({ id, name, kind })),
        }),
        signal: resources.abortController.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "تعذر الاتصال بالمساعد الصوتي. حاول مرة أخرى.");
      }
      await resources.peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
      startInFlightRef.current = false;
      if (generation !== generationRef.current) {
        cleanupRealtimeResources(resources);
        return;
      }
      resources.connectionTimer = setTimeout(() => {
        if (generation === generationRef.current && resources.channel?.readyState !== "open") {
          setError("استغرق الاتصال وقتًا أطول من المتوقع. حاول مرة أخرى.");
          release("error");
        }
      }, 15000);
    } catch (startError) {
      startInFlightRef.current = false;
      if (generation !== generationRef.current) return;
      setError(classifyVoiceError(startError));
      cleanupRealtimeResources(resources);
      resourcesRef.current = {};
      setStatus("error");
    }
  }, [account, availability, beneficiaries, conversationId, handleServerEvent, release]);

  const stop = useCallback(() => release("idle"), [release]);

  const toggleMute = useCallback(() => {
    const stream = resourcesRef.current.stream;
    if (!stream) return;
    const nextMuted = !mutedRef.current;
    stream.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    setStatus(nextMuted ? "muted" : "listening");
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setLastDraftChange("");
    setError("");
  }, []);

  return {
    status,
    transcript,
    error,
    muted,
    lastDraftChange,
    availability,
    active: Boolean(resourcesRef.current.peer || resourcesRef.current.stream) || ["requesting_permission", "connecting"].includes(status),
    start,
    stop,
    toggleMute,
    clearTranscript,
  };
}
