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
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    // Detect password recovery redirect from hash
    let recoveryFromHash = false;
    try {
      const hash = window.location.hash || "";
      recoveryFromHash = hash.includes("type=recovery");
      if (recoveryFromHash) {
        setIsRecovery(true);
        localStorage.setItem("recovery_in_progress", "1");
        toast({ title: "Reset password", description: "Enter a new password below." });
      }
    } catch {}

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        localStorage.setItem("recovery_in_progress", "1");
        toast({ title: "Reset password", description: "Enter a new password below." });
        return; // Do NOT redirect during recovery
      }
      const recovering = localStorage.getItem("recovery_in_progress") === "1" || isRecovery;
      if (session && !recovering) {
        window.location.href = "/dashboard";
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const recovering = localStorage.getItem("recovery_in_progress") === "1" || recoveryFromHash || isRecovery;
      if (session && !recovering) {
        window.location.href = "/dashboard";
      }
    });

    return () => subscription.unsubscribe();
  }, [isRecovery]);

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

  const handleResetPassword = async () => {
    try {
      if (!email) {
        toast({ title: "Enter your email", description: "Type your email, then click Forgot password." });
        return;
      }
      const redirectUrl = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (error) throw error;
      toast({ title: "Check your email", description: "Password reset link sent." });
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message || "Please try again." });
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast({ title: "Missing password", description: "Enter a new password." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now continue." });
      localStorage.removeItem("recovery_in_progress");
      setIsRecovery(false);
      window.location.href = "/dashboard";
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message || "Try again." });
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
          {!isRecovery && (
            <>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm underline text-muted-foreground text-left"
                >
                  Forgot password?
                </button>
              )}
            </>
          )}
          {isRecovery && (
            <>
              <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Button onClick={handleUpdatePassword} disabled={loading} className="w-full">Update password</Button>
            </>
          )}
          {!isRecovery && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleAuth} disabled={loading}>{isSignUp ? "Sign up" : "Sign in"}</Button>
            </div>
          )}
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
