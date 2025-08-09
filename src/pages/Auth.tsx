import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    if (!email || !password) return toast({ title: "Missing fields", description: "Enter email and password." });
    localStorage.setItem("vss_mock_user", JSON.stringify({ email }));
    toast({ title: "Signed in (mock)", description: "This is a mock auth flow." });
    window.location.href = "/dashboard";
  };

  return (
    <main className="min-h-screen flex items-center justify-center surface-glow">
      <Card className="p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Mock auth for demo</p>
        <div className="mt-4 space-y-3">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={signIn} disabled={loading}>Sign in</Button>
          </div>
        </div>
        <a href="/" className="block text-center mt-4 text-sm underline text-muted-foreground">Back home</a>
      </Card>
    </main>
  );
};

export default Auth;
