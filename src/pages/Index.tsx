import { useEffect } from "react";
import RiskWidget from "@/components/RiskWidget";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mic, Languages } from "lucide-react";

const Index = () => {
  useEffect(() => {
    const title = "Real‑Time Scam Call Protection | Voice Scam Shield";
    document.title = title;
    const metaDesc = "Stay safe on calls with real-time transcription, deepfake detection, and discreet alerts.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', metaDesc);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical!.setAttribute('href', window.location.origin + '/');
  }, []);
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
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
              New • Real‑time call protection
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">Real‑Time Protection from Scam Calls and Deepfakes</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose">Voice Scam Shield quietly monitors voice and video calls, spots risky requests and AI‑generated voices, and guides you in the moment—so you stay focused and safe.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/dashboard"><Button className="transition-transform duration-200 hover:scale-105">Try Mock Demo</Button></a>
              <Button variant="outline" asChild>
                <a className="transition-transform duration-200 hover:scale-105" href="#how-it-works">How it works</a>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><span>On‑device cues</span></div>
              <div className="flex items-center gap-2"><Mic className="h-4 w-4 text-primary" /><span>Low‑latency</span></div>
              <div className="flex items-center gap-2"><Languages className="h-4 w-4 text-primary" /><span>EN/ES/FR</span></div>
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
            <div className="mt-6 text-sm text-muted-foreground space-y-2">
              <p>Real‑time transcription with clear separation between speakers.</p>
              <p>Automatic checks that help identify synthetic and impersonated voices.</p>
              <p>Discreet on‑screen and spoken nudges when something seems risky.</p>
            </div>
          </Card>
        </div>
      </section>

      <section aria-labelledby="features" className="container py-16">
        <h2 id="features" className="text-2xl font-semibold">Why choose Voice Scam Shield</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <article className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Real‑time risk checks</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Flags phishing requests, impersonation, and deepfake cues during the call.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Mic className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Clear live transcript</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Speaker‑separated transcription so you can follow the conversation.
            </p>
          </article>
          <article className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Multilingual support</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Works with English, Spanish, and French—auto‑detects and adapts.
            </p>
          </article>
        </div>
      </section>

      <section id="how-it-works" className="container py-16 pb-28 md:pb-16">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <p className="mt-4 text-muted-foreground max-w-prose">
          We securely capture audio from your voice and video calls, analyze speech to understand intent and authenticity, and provide discreet guidance in real time. No complex setup—just clear protection as you talk.
        </p>
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
