import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureNotificationPermission, sendLocalNotification } from "@/mobile/notifications";
export type LiveItem = {
  id: string;
  t: number; // timestamp ms
  speaker: string;
  text: string;
  label: "Safe" | "Suspicious" | "Scam" | string;
  rationale?: string;
  language: string;
};

export const useRealtimeSession = (defaultLanguage: string = "en") => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [risk, setRisk] = useState(0);
  const [language] = useState(defaultLanguage);
  const [items, setItems] = useState<LiveItem[]>([]);

  const userIdRef = useRef<string | null>(null);
  const lastItemAtRef = useRef<number>(0);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Simple VAD-ish indicator: speaking if last item within 3s
  useEffect(() => {
    const i = setInterval(() => {
      const now = Date.now();
      setIsSpeaking(now - lastItemAtRef.current < 3000);
    }, 1000);
    return () => clearInterval(i);
  }, []);

  function playNext() {
    if (isPlayingRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next) return;
    if (!audioElRef.current) audioElRef.current = new Audio();
    const el = audioElRef.current;
    el.src = `data:audio/mpeg;base64,${next}`;
    isPlayingRef.current = true;
    el.onended = () => {
      isPlayingRef.current = false;
      playNext();
    };
    el.onerror = () => {
      isPlayingRef.current = false;
      playNext();
    };
    void el.play().catch(() => {
      isPlayingRef.current = false;
      playNext();
    });
  }

  function enqueueAudio(b64: string) {
    audioQueueRef.current.push(b64);
    if (!isPlayingRef.current) playNext();
  }

  async function speak(text: string, voiceId = "9BWtsMINqrJLrRacOk9x", modelId?: string) {
    try {
      const { data, error } = await supabase.functions.invoke("voice-alert", {
        body: { text, voiceId, modelId },
      });
      if (error) {
        console.error("voice-alert invoke error:", error);
        return;
      }
      if (data?.audio) enqueueAudio(data.audio as string);
    } catch (e) {
      console.error("speak error", e);
    }
  }

  function addLocalTranscript(
    speaker: string,
    text: string,
    label: LiveItem["label"] = "Safe",
    rationale?: string,
    lang?: string
  ) {
    const item: LiveItem = {
      id: `local-${Date.now()}`,
      t: Date.now(),
      speaker,
      text,
      label,
      rationale,
      language: lang || defaultLanguage,
    };
    lastItemAtRef.current = item.t;
    setItems((prev) => [...prev, item]);
  }

  async function testAudioSnippet(lang: "en" | "es" | "fr") {
    const samples = {
      en: { text: "This is a safe confirmation about your appointment tomorrow.", label: "Safe" as const, risk: 15 },
      es: { text: "Por favor, comparta el código de verificación de seis dígitos que recibió por SMS.", label: "Suspicious" as const, risk: 55 },
      fr: { text: "Veuillez fournir les informations de votre carte bancaire pour vérifier votre identité.", label: "Scam" as const, risk: 90 },
    };
    const s = samples[lang];
    addLocalTranscript("Caller", s.text, s.label, undefined, lang);
    setRisk(s.risk);
    // Speak the phrase using multilingual model for better pronunciation
    await speak(s.text, undefined, "eleven_multilingual_v2");
    if (s.label !== "Safe") {
      sendLocalNotification(
        s.label === "Scam" ? "Scam Alert" : "Suspicious Activity",
        s.label === "Scam" ? "Potential scam detected. Stay safe." : "Something seems off. Verify identity."
      );
    }
  }

  function simulateEvent(label: LiveItem["label"]) {
    // Map label to example text and risk
    const mapping = {
      Safe: { text: "This looks fine, just confirming your appointment.", risk: 15 },
      Suspicious: { text: "They are asking for an OTP code. Proceed carefully.", risk: 55 },
      Scam: { text: "Provide your bank details now or face consequences.", risk: 90 },
    } as const;

    const m = mapping[(label as keyof typeof mapping) || "Safe"]; // fallback Safe
    addLocalTranscript("Caller", m.text, label);
    setRisk(m.risk);

    if (label === "Suspicious" || label === "Scam") {
      void speak(`Alert ${label}. ${label === 'Scam' ? 'Do not share personal or financial information.' : 'Be cautious and verify the caller.'}`);
      sendLocalNotification(
        label === "Scam" ? "Scam Alert" : "Suspicious Activity",
        label === "Scam" ? "Potential scam detected. Stay safe." : "Something seems off. Verify identity."
      );
    }
  }
  const start = async () => {
    // Resolve user
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id || null;
    userIdRef.current = userId;

    // Load recent history (best-effort)
    if (userId) {
      const [{ data: transcripts }, { data: calls }] = await Promise.all([
        supabase
          .from("transcripts")
          .select("id, created_at, speaker, content, label, rationale, user_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(200),
        supabase
          .from("calls")
          .select("id, risk_score, user_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (transcripts && transcripts.length) {
        const mapped = transcripts.map((r) => ({
          id: r.id,
          t: new Date(r.created_at as string).getTime(),
          speaker: r.speaker as string,
          text: r.content as string,
          label: (r.label as any) || "Suspicious",
          rationale: (r.rationale as string) || undefined,
          language: defaultLanguage,
        }));
        lastItemAtRef.current = mapped[mapped.length - 1]?.t ?? 0;
        setItems(mapped);
      }
      if (calls && calls.length) setRisk(calls[0].risk_score as number);
    }

    // Subscribe to realtime changes
    const chTranscripts = supabase
      .channel("realtime-transcripts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transcripts" },
        (payload: any) => {
          const row = payload.new;
          const uid = userIdRef.current;
          if (!uid || row.user_id !== uid) return;
          const item: LiveItem = {
            id: row.id,
            t: new Date(row.created_at).getTime(),
            speaker: row.speaker,
            text: row.content,
            label: row.label || "Suspicious",
            rationale: row.rationale || undefined,
            language: defaultLanguage,
          };
          lastItemAtRef.current = item.t;
          setItems((prev) => [...prev, item]);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnected(true);
      });

    const chCalls = supabase
      .channel("realtime-calls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls" },
        (payload: any) => {
          const row = payload.new;
          const uid = userIdRef.current;
          if (!uid || row.user_id !== uid) return;
          if (typeof row.risk_score === "number") {
            setRisk(row.risk_score);
            if (row.risk_score >= 70) {
              sendLocalNotification("High Call Risk Detected", `Risk score ${row.risk_score}%`);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        (payload: any) => {
          const row = payload.new;
          const uid = userIdRef.current;
          if (!uid || row.user_id !== uid) return;
          if (typeof row.risk_score === "number") {
            setRisk(row.risk_score);
            if (row.risk_score >= 70) {
              sendLocalNotification("High Call Risk Detected", `Risk score ${row.risk_score}%`);
            }
          }
        }
      )
      .subscribe();

    const chAlerts = supabase
      .channel("realtime-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        async (payload: any) => {
          const row = payload.new;
          const uid = userIdRef.current;
          if (!uid || row.user_id !== uid) return;
          const level = (row.level || "info").toString();
          const message = (row.message || "New alert").toString();
          await speak(`Alert ${level}. ${message}`);
          sendLocalNotification(`Call Alert: ${level}`, message);
        }
      )
      .subscribe();

    channelsRef.current = [chTranscripts, chCalls, chAlerts];

    // Ensure notification permissions on mobile
    ensureNotificationPermission();
  };

  const stop = async () => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
    setConnected(false);
  };

  return useMemo(
    () => ({ connected, isSpeaking, risk, language, items, start, stop, speak, addLocalTranscript, simulateEvent, testAudioSnippet }),
    [connected, isSpeaking, risk, language, items]
  );
};
