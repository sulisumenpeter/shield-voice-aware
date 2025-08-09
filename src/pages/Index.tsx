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
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">Real‑Time Protection from Scam Calls and Deepfakes</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose">Voice Scam Shield quietly monitors voice and video calls, spots risky requests and AI‑generated voices, and guides you in the moment—so you stay focused and safe.</p>
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
            <div className="mt-6 text-sm text-muted-foreground space-y-2">
              <p>Real‑time transcription with clear separation between speakers.</p>
              <p>Automatic checks that help identify synthetic and impersonated voices.</p>
              <p>Discreet on‑screen and spoken nudges when something seems risky.</p>
            </div>
          </Card>
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
