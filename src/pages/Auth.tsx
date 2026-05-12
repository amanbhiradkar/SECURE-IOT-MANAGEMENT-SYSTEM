import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email above first");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          try {
            const { data } = await supabase.functions.invoke("record-login-attempt", {
              body: { email },
            });
            if (data?.bruteForce) {
              toast.error(`🚨 Brute force attack detected! ${data.attempts} failed attempts logged.`, {
                duration: 6000,
              });
            } else {
              toast.error(`${error.message} (attempt ${data?.attempts ?? "?"}/3)`);
            }
          } catch {
            toast.error(error.message);
          }
          return;
        }
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cyber-grid">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-lg glow-primary">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold text-foreground font-display">
            IoT Shield
          </h1>
        </div>
        <p className="text-center text-muted-foreground mb-8 text-sm">
          {isSignUp ? "Create your admin account" : "Sign in to the monitoring dashboard"}
        </p>
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-secondary-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@iotshield.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-muted border-border"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-secondary-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-muted border-border"
                required
                minLength={6}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
          {!isSignUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {resetting ? "Sending reset link..." : "Forgot password?"}
            </button>
          )}
        </form>
        <p className="text-center mt-6 text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
