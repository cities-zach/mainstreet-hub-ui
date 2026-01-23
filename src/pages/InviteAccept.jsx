import React, { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => apiFetch(`/invites/verify?token=${encodeURIComponent(token)}`),
    enabled: Boolean(token),
  });

  const email = invite?.email || "";
  const orgName = invite?.organization_name || "MainSuite";
  const role = invite?.role || "volunteer";

  const canSubmit = useMemo(() => {
    if (!token || !email) return false;
    if (!password || password.length < 8) return false;
    return password === confirmPassword;
  }, [token, email, password, confirmPassword]);

  const acceptInvite = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setNotice(null);

    try {
      const { data: existingSession } = await supabase.auth.getSession();
      const existingEmail = existingSession?.session?.user?.email?.toLowerCase();
      if (existingEmail && existingEmail !== email.toLowerCase()) {
        await supabase.auth.signOut();
      }

      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: fullName ? { data: { full_name: fullName } } : undefined,
      });

      if (signUpResult.error) {
        const message = signUpResult.error.message || "Sign up failed";
        if (message.toLowerCase().includes("already registered")) {
          const signInResult = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInResult.error) {
            throw signInResult.error;
          }
        } else {
          throw signUpResult.error;
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setNotice("Please sign in to finish accepting your invite.");
        return;
      }

      await apiFetch("/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token, full_name: fullName || null }),
      });

      toast.success("Invite accepted!");
      navigate("/");
    } catch (error) {
      toast.error(error?.message || "Failed to accept invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return <div className="p-8 text-center">Missing invite token.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading invite…</div>;
  }

  if (!invite?.email) {
    return (
      <div className="p-8 text-center">
        This invite is invalid or has expired.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Accept your invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600">
              You’ve been invited to join <strong>{orgName}</strong> as{" "}
              <strong>{role.replace("_", " ")}</strong>.
            </div>
            <div className="text-sm text-slate-600">
              Email: <strong>{email}</strong>
            </div>

            <form onSubmit={acceptInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>Full name (optional)</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {notice && (
                <div className="text-sm text-slate-600">{notice}</div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#835879] text-white"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Accepting…" : "Accept Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
