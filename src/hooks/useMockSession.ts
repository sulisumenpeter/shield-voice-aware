import { useEffect, useMemo, useRef, useState } from "react";

export type RiskLabel = "Safe" | "Suspicious" | "Scam";

export interface TranscriptItem {
  id: string;
  t: number; // timestamp
  speaker: "You" | "Caller";
  language: "en" | "es" | "fr";
  text: string;
  label: RiskLabel;
  rationale: string;
}

export interface UseMockSession {
  connected: boolean;
  isSpeaking: boolean;
  risk: number; // 0-100
  language: "en" | "es" | "fr";
  items: TranscriptItem[];
  start: () => void;
  stop: () => void;
}

const SAMPLES = {
  en: [
    { speaker: "Caller" as const, text: "I'm calling from your bank. We detected unusual activity.", label: "Suspicious" as RiskLabel, rationale: "Authority + urgency" },
    { speaker: "You" as const, text: "Which bank are you calling from?", label: "Safe" as RiskLabel, rationale: "Clarification" },
    { speaker: "Caller" as const, text: "Please share the 6-digit code just sent to your phone.", label: "Scam" as RiskLabel, rationale: "2FA code request" },
    { speaker: "You" as const, text: "I won't share any codes.", label: "Safe" as RiskLabel, rationale: "Good practice" },
  ],
  es: [
    { speaker: "Caller" as const, text: "Llamo del banco, hay actividad sospechosa.", label: "Suspicious" as RiskLabel, rationale: "Autoridad + urgencia" },
    { speaker: "You" as const, text: "¿De qué banco llama?", label: "Safe" as RiskLabel, rationale: "Aclaración" },
    { speaker: "Caller" as const, text: "Comparta el código de verificación que recibió.", label: "Scam" as RiskLabel, rationale: "Código 2FA" },
    { speaker: "You" as const, text: "No compartiré ningún código.", label: "Safe" as RiskLabel, rationale: "Buena práctica" },
  ],
  fr: [
    { speaker: "Caller" as const, text: "J'appelle de votre banque, activité inhabituelle détectée.", label: "Suspicious" as RiskLabel, rationale: "Autorité + urgence" },
    { speaker: "You" as const, text: "De quelle banque appelez-vous ?", label: "Safe" as RiskLabel, rationale: "Clarification" },
    { speaker: "Caller" as const, text: "Veuillez partager le code à 6 chiffres reçu.", label: "Scam" as RiskLabel, rationale: "Demande de code 2FA" },
    { speaker: "You" as const, text: "Je ne partagerai aucun code.", label: "Safe" as RiskLabel, rationale: "Bonne pratique" },
  ],
};

function nextRisk(prev: number, label: RiskLabel) {
  const delta = label === "Scam" ? 18 : label === "Suspicious" ? 8 : -6;
  return Math.max(0, Math.min(100, prev + delta + (Math.random() * 4 - 2)));
}

export function useMockSession(initialLang: "en" | "es" | "fr" = "en"): UseMockSession {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setSpeaking] = useState(false);
  const [risk, setRisk] = useState(8);
  const [language, setLanguage] = useState<"en" | "es" | "fr">(initialLang);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const timerRef = useRef<number | null>(null);

  const pool = useMemo(() => SAMPLES[language], [language]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const start = () => {
    if (connected) return;
    setConnected(true);
    setSpeaking(true);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      const sample = pool[i % pool.length];
      const id = `${Date.now()}-${i}`;
      const t = Date.now();
      const label = sample.label;
      setRisk((r) => nextRisk(r, label));
      setItems((prev) => [
        { id, t, speaker: sample.speaker, language, text: sample.text, label, rationale: sample.rationale },
        ...prev,
      ].slice(0, 100));
      setSpeaking((s) => !s);
      i++;
      if (i % 8 === 0) {
        // rotate language to show multilingual capability
        setLanguage((l) => (l === "en" ? "es" : l === "es" ? "fr" : "en"));
      }
    }, 1300);
  };

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setConnected(false);
    setSpeaking(false);
  };

  return { connected, isSpeaking, risk, language, items, start, stop };
}
