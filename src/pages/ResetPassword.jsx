import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, KeyRound, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

function recoveryLinkHasError() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.has("error") || query.has("error_code") || hash.has("error") || hash.has("error_code");
}

export default function ResetPassword() {
  const [recoveryState, setRecoveryState] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" && session) setRecoveryState("ready");
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      setRecoveryState(!recoveryLinkHasError() && !error && data.session ? "ready" : "invalid");
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (password.length < 8) {
      setStatus({ type: "error", message: "Your password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "The passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) await supabase.auth.signOut({ scope: "local" });
      setPassword("");
      setConfirmPassword("");
      setRecoveryState("complete");
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "We couldn't update your password. Please request a new link and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="w-full max-w-md bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-[#2d4650]">
            <KeyRound className="h-6 w-6 text-[#835879]" />
            Choose a new password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recoveryState === "checking" && (
            <div className="py-8 text-center text-slate-600" role="status">
              <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-[#835879]" />
              Checking your reset link…
            </div>
          )}

          {recoveryState === "invalid" && (
            <div className="space-y-5 text-center">
              <TriangleAlert className="mx-auto h-10 w-10 text-amber-500" />
              <div>
                <h1 className="font-semibold text-slate-900">This reset link is no longer valid</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Password reset links expire and can only be used once. Return to sign in and request a new link.
                </p>
              </div>
              <Button asChild className="w-full bg-[#835879] text-white">
                <Link to="/login">Return to sign in</Link>
              </Button>
            </div>
          )}

          {recoveryState === "complete" && (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <div>
                <h1 className="font-semibold text-slate-900">Your password has been updated</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You can now sign in to MainSuite with your new password.
                </p>
              </div>
              <Button asChild className="w-full bg-[#835879] text-white">
                <Link to="/login">Continue to sign in</Link>
              </Button>
            </div>
          )}

          {recoveryState === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                Use at least 8 characters. After saving, you'll return to sign in with your new password.
              </p>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  className="mt-1"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  className="mt-1"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              {status && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
                >
                  {status.message}
                </div>
              )}
              <Button
                className="w-full bg-[#835879] text-white"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating password…" : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
