import RiskWidget from "@/components/RiskWidget";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <main>
      <header className="container py-10">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-xl font-semibold gradient-text">Voice Scam Shield</a>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm underline text-muted-foreground">Open Dashboard</a>
            <a href="/login" className="text-sm underline text-muted-foreground">Sign in</a>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 surface-glow pointer-events-none" aria-hidden />
        <div className="container py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Multilingual AI for Real‑Time Scam & Deepfake Detection
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose">
              Detect scam intent and synthetic voices during live phone and video calls. Get discreet, real‑time alerts and guidance in English, Spanish, and French.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/dashboard"><Button>Try Mock Demo</Button></a>
              <Button variant="outline" asChild>
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>
          </div>
          <Card className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Risk</p>
                <p className="text-3xl font-semibold">Real‑Time</p>
              </div>
              <div className="h-20 w-20 rounded-full border" style={{ boxShadow: "var(--shadow-glow)" }} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Transcription</p><p>Streaming ASR (Whisper)</p></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Anti‑spoof</p><p>AASIST (Mock)</p></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Diarization</p><p>Caller / You</p></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Alerts</p><p>Discreet TTS</p></div>
            </div>
          </Card>
        </div>
      </section>

      <section id="how-it-works" className="container py-16">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-medium">Capture</h3>
            <p className="mt-2 text-sm text-muted-foreground">Integrate Twilio Media Streams, WebRTC, and Zoom SDK to securely stream audio.</p>
          </Card>
          <Card className="p-6">
            <h3 className="font-medium">Analyze</h3>
            <p className="mt-2 text-sm text-muted-foreground">Whisper for ASR, LLM for intent, AASIST for anti‑spoof. Multilingual and low latency.</p>
          </Card>
          <Card className="p-6">
            <h3 className="font-medium">Alert</h3>
            <p className="mt-2 text-sm text-muted-foreground">Discreet on‑screen and spoken alerts guide users without exposing sensitive info.</p>
          </Card>
        </div>
      </section>

      <RiskWidget autoplay={false} />

      {/* JSON‑LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Voice Scam Shield",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        description: "Multilingual AI that flags scam intent and deepfakes during live calls with discreet real-time alerts.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
      }) }} />
    </main>
  );
};

export default Index;
