import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  async function speak(text: string, voiceId = "9BWtsMINqrJLrRacOk9x") {
    try {
      const { data, error } = await supabase.functions.invoke("voice-alert", {
        body: { text, voiceId },
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
          if (typeof row.risk_score === "number") setRisk(row.risk_score);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        (payload: any) => {
          const row = payload.new;
          const uid = userIdRef.current;
          if (!uid || row.user_id !== uid) return;
          if (typeof row.risk_score === "number") setRisk(row.risk_score);
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
        }
      )
      .subscribe();

    channelsRef.current = [chTranscripts, chCalls, chAlerts];
  };

  const stop = async () => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
    setConnected(false);
  };

  return useMemo(
    () => ({ connected, isSpeaking, risk, language, items, start, stop, speak }),
    [connected, isSpeaking, risk, language, items]
  );
};
