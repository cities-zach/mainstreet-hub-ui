import React, { useState } from "react";
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
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/", { replace: true });
      } else {
        if (!acceptedPrivacy || !acceptedTerms) {
          setStatus({
            type: "error",
            message: "Please accept the Privacy Policy and Terms of Service.",
          });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        await apiFetch("/policies/accept", { method: "POST" });
        setStatus({
          type: "success",
          message: "Account created. You can now sign in.",
        });
        setMode("sign_in");
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Authentication failed.",
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
            {mode === "sign_in" ? "Sign in to MainSuite" : "Create your account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
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
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Working..."
                : mode === "sign_in"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-sm text-center text-slate-500">
            {mode === "sign_in" ? "Need an account?" : "Already have an account?"}
            <button
              type="button"
              className="ml-2 text-[#835879] font-semibold"
              onClick={() =>
                setMode((prev) => (prev === "sign_in" ? "sign_up" : "sign_in"))
              }
            >
              {mode === "sign_in" ? "Create one" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
