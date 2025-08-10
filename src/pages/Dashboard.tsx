import { useEffect } from "react";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Gauge = ({ value }: { value: number }) => {
  const hue = value < 35 ? 160 : value < 70 ? 40 : 0; // green -> amber -> red
  return (
    <div className="relative h-32 w-32 rounded-full border flex items-center justify-center" style={{ boxShadow: "var(--shadow-elegant)" }}>
      <svg viewBox="0 0 36 36" className="h-28 w-28 rotate-[-90deg]">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted-foreground)/0.2)" strokeWidth="2" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke={`hsl(${hue} 80% 50%)`} strokeWidth="2" strokeDasharray={`${value}, 100`} />
      </svg>
      <div className="absolute text-2xl font-semibold">{Math.round(value)}%</div>
      <div className="absolute bottom-2 text-xs text-muted-foreground">Risk</div>
    </div>
  );
};

const Dashboard = () => {
  const { connected, isSpeaking, risk, language, items, start, stop, speak, addLocalTranscript, simulateEvent, testAudioSnippet } = useRealtimeSession("en");

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColor = risk >= 70 ? "destructive" : risk >= 35 ? "secondary" : "default";
  const riskLabel = risk >= 70 ? "Not safe" : risk >= 35 ? "Suspicious" : "Safe";
  const riskVariant = risk >= 70 ? "destructive" : risk >= 35 ? "secondary" : "outline";

  return (
    <main className="min-h-screen bg-background surface-glow">
      <header className="container py-6 flex items-center justify-between">
        <a href="/" className="font-semibold gradient-text text-xl">Voice Scam Shield</a>
        <div className="flex items-center gap-3">
          <Badge variant={statusColor as any}>{isSpeaking ? "Live" : connected ? "Connected" : "Idle"} • {language.toUpperCase()}</Badge>
          {connected ? (
            <Button variant="outline" onClick={stop}>Stop</Button>
          ) : (
            <Button onClick={start}>Start</Button>
          )}
          <Button
            variant="secondary"
            onClick={async () => {
              await speak("Test alert: This is a voice alert test.");
              toast({ title: "Playing test voice alert" });
            }}
          >
            Test Voice Alert
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              toast({ title: "Signed out" });
              window.location.href = "/login";
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <section className="container grid md:grid-cols-[360px_1fr] gap-6 pb-16">
        <Card className="p-6 sticky top-6 h-fit">
          <h1 className="text-2xl font-bold">Live Risk</h1>
          <p className="text-sm text-muted-foreground mt-1">Realtime scoring from transcript.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2">
            <Gauge value={risk} />
            <Badge variant={riskVariant as any}>{riskLabel}</Badge>
          </div>
          <Separator className="my-6" />
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Scam cues</span><span className="text-muted-foreground">2FA, urgency</span></div>
            <div className="flex items-center justify-between"><span>Speaker diarization</span><span className="text-muted-foreground">You / Caller</span></div>
            <div className="flex items-center justify-between"><span>Anti-spoof</span><Badge variant="outline">Disabled</Badge></div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold">Transcript</h2>
          <p className="text-sm text-muted-foreground">Multilingual (EN/ES/FR) — new chunks every ~1.3s</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>How to test:</span>
            <span>1) Click Start</span>
            <span>2) Speak on a call</span>
            <span>3) Or simulate risk:</span>
            <Button size="sm" variant="outline" onClick={() => simulateEvent("Safe")}>Safe</Button>
            <Button size="sm" variant="secondary" onClick={() => simulateEvent("Suspicious")}>Suspicious</Button>
            <Button size="sm" variant="destructive" onClick={() => simulateEvent("Scam")}>Not safe</Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Audio snippets (TTS):</span>
            <Button size="sm" variant="outline" onClick={() => testAudioSnippet("en")}>Test EN</Button>
            <Button size="sm" variant="secondary" onClick={() => testAudioSnippet("es")}>Test ES</Button>
            <Button size="sm" variant="destructive" onClick={() => testAudioSnippet("fr")}>Test FR</Button>
          </div>
          <div className="mt-4 space-y-3 max-h-[70vh] overflow-auto pr-2">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Waiting for audio…</p>
            )}
            {items.map((it) => (
              <div key={it.id} className="rounded-md border p-3 hover:bg-accent/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(it.t).toLocaleTimeString()} • {it.speaker} • {it.language.toUpperCase()}</span>
                  <Badge variant={it.label === "Scam" ? "destructive" : it.label === "Suspicious" ? "secondary" : "outline"}>{it.label}</Badge>
                </div>
                <p className="mt-1 leading-snug">{it.text}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{it.rationale}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
};

export default Dashboard;
