import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        window.location.href = "/dashboard";
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/dashboard";
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (!email || !password) {
        toast({ title: "Missing fields", description: "Enter email and password." });
        return;
      }

      if (isSignUp) {
        const redirectUrl = `${window.location.origin}/`;
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        if (!data.session) {
          toast({ title: "Check your email", description: "Confirm your email to finish signing up." });
        } else {
          toast({ title: "Signed up", description: "Welcome!" });
          window.location.href = "/dashboard";
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Signed in" });
        window.location.href = "/dashboard";
      }
    } catch (e: any) {
      toast({ title: "Authentication error", description: e.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      toast({ title: "Redirecting to Google..." });
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center surface-glow">
      <Card className="p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold">{isSignUp ? "Create account" : "Sign in"}</h1>
        <p className="text-sm text-muted-foreground">{isSignUp ? "Register with email and password" : "Use your email and password"}</p>
        <div className="mt-4 space-y-3">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleAuth} disabled={loading}>{isSignUp ? "Sign up" : "Sign in"}</Button>
          </div>
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>
        </div>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="block text-center mt-3 text-sm underline text-muted-foreground"
        >
          {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
        </button>
        <a href="/" className="block text-center mt-2 text-sm underline text-muted-foreground">Back home</a>
      </Card>
    </main>
  );
};

export default Auth;
