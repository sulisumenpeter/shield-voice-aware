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
  const { connected, isSpeaking, risk, language, items, start, stop } = useRealtimeSession("en");

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColor = risk >= 70 ? "destructive" : risk >= 35 ? "secondary" : "default";

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
          <div className="mt-6 flex items-center justify-center">
            <Gauge value={risk} />
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
