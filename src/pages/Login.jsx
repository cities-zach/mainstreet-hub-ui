import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/api";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setStatus(null);
    setPassword("");
    if (nextMode !== "sign_up") setFullName("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      if (mode === "forgot_password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setStatus({
          type: "success",
          message: "If an account exists for this email, a password reset link is on its way. Please check your inbox and spam folder.",
        });
        setResendSeconds(60);
      } else if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate("/", { replace: true });
      } else {
        if (!fullName.trim()) {
          setStatus({
            type: "error",
            message: "Please enter your full name.",
          });
          return;
        }
        if (!acceptedPrivacy || !acceptedTerms) {
          setStatus({
            type: "error",
            message: "Please accept the Privacy Policy and Terms of Service.",
          });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        await apiFetch("/policies/accept", { method: "POST" });
        setStatus({
          type: "success",
          message: "Account created. You can now sign in.",
        });
        setMode("sign_in");
        setFullName("");
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: mode === "forgot_password"
          ? "We couldn't send the reset email. Please wait a moment and try again."
          : error.message || "Authentication failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md bg-white/90">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#2d4650]">
            {mode === "sign_in"
              ? "Sign in to MainSuite"
              : mode === "forgot_password"
                ? "Reset your password"
                : "Create your account"}
          </CardTitle>
          {mode === "forgot_password" && (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter your email and we'll send you a secure link to choose a new password.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            {mode !== "forgot_password" && (
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <Label htmlFor="login-password">Password</Label>
                  {mode === "sign_in" && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#835879] hover:underline"
                      onClick={() => changeMode("forgot_password")}
                    >
                      Forgot your password?
                    </button>
                  )}
                </div>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                  minLength={mode === "sign_up" ? 8 : undefined}
                  required
                />
              </div>
            )}
            {mode === "sign_up" && (
              <div>
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
            )}
            {mode === "sign_up" && (
              <div className="space-y-3 text-sm text-slate-600">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={acceptedPrivacy}
                    onCheckedChange={(value) =>
                      setAcceptedPrivacy(Boolean(value))
                    }
                  />
                  <span>
                    I agree to the{" "}
                    <a className="text-[#835879] underline" href="/privacy" target="_blank" rel="noreferrer">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(value) => setAcceptedTerms(Boolean(value))}
                  />
                  <span>
                    I agree to the{" "}
                    <a className="text-[#835879] underline" href="/terms" target="_blank" rel="noreferrer">
                      Terms of Service
                    </a>
                    .
                  </span>
                </label>
              </div>
            )}

            {status && (
              <div
                role={status.type === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`rounded-lg px-3 py-2 text-sm ${
                  status.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {status.message}
              </div>
            )}

            <Button
              className="w-full bg-[#835879] text-white"
              type="submit"
              disabled={isSubmitting || (mode === "forgot_password" && resendSeconds > 0)}
            >
              {isSubmitting
                ? "Working..."
                : mode === "forgot_password"
                  ? resendSeconds > 0
                    ? `Send another link in ${resendSeconds}s`
                    : "Send reset link"
                : mode === "sign_in"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-sm text-center text-slate-500">
            {mode === "sign_in"
              ? "Need an account?"
              : mode === "forgot_password"
                ? "Remember your password?"
                : "Already have an account?"}
            <button
              type="button"
              className="ml-2 text-[#835879] font-semibold"
              onClick={() => changeMode(mode === "sign_in" ? "sign_up" : "sign_in")}
            >
              {mode === "sign_in" ? "Create one" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
