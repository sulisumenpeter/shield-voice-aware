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

  // Simple VAD-ish indicator: speaking if last item within 3s
  useEffect(() => {
    const i = setInterval(() => {
      const now = Date.now();
      setIsSpeaking(now - lastItemAtRef.current < 3000);
    }, 1000);
    return () => clearInterval(i);
  }, []);

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

    channelsRef.current = [chTranscripts, chCalls];
  };

  const stop = async () => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
    setConnected(false);
  };

  return useMemo(
    () => ({ connected, isSpeaking, risk, language, items, start, stop }),
    [connected, isSpeaking, risk, language, items]
  );
};
