import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccessRequestPanel({ session, onReset }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(
    session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || ""
  );
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const requestQuery = useQuery({
    queryKey: ["access-request", "me"],
    queryFn: () => apiFetch("/access-requests/me"),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () => apiFetch("/access-requests", {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName.trim(),
        accepted_policies: acceptedPrivacy && acceptedTerms,
      }),
    }),
    onSuccess: async (request) => {
      queryClient.setQueryData(["access-request", "me"], request);
      if (request?.status === "approved") {
        await queryClient.resetQueries({ queryKey: ["me"] });
      }
    },
  });

  const accessRequest = requestQuery.data;
  const pending = accessRequest?.status === "pending";
  const denied = accessRequest?.status === "denied";
  const canSubmit = Boolean(
    fullName.trim() && acceptedPrivacy && acceptedTerms && !submitMutation.isPending
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">
            {pending ? "Your access request is pending" : denied ? "Access was not approved" : "Request access to MainSuite"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {pending
              ? "An organization administrator can now see your request in User Management. You can sign in again after it is approved."
              : denied
                ? "You can submit a new request if your access needs have changed, or contact an organization administrator."
                : "Your sign-in is valid, but it is not connected to this organization yet. Submit a request so an administrator can approve your role."}
          </p>
          {session?.user?.email && (
            <p className="mt-2 text-sm font-medium text-slate-700">{session.user.email}</p>
          )}
        </div>

        {requestQuery.isLoading ? (
          <p className="mt-6 text-center text-sm text-slate-500">Checking your access request…</p>
        ) : !pending ? (
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-request-name">Full name</Label>
              <Input
                id="access-request-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                maxLength={200}
              />
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={acceptedPrivacy}
                  onCheckedChange={(value) => setAcceptedPrivacy(Boolean(value))}
                />
                <span>
                  I agree to the{" "}
                  <a className="text-[#835879] underline" href="/privacy" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </a>.
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
                  </a>.
                </span>
              </label>
            </div>
            {submitMutation.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitMutation.error.message || "The access request could not be submitted."}
              </p>
            )}
            <Button
              type="button"
              className="w-full bg-[#835879] text-white"
              disabled={!canSubmit}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting…" : denied ? "Submit a new request" : "Request access"}
            </Button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            Requested {new Date(accessRequest.requested_at).toLocaleString()}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {pending && (
            <button
              type="button"
              onClick={() => {
                requestQuery.refetch();
                queryClient.resetQueries({ queryKey: ["me"] });
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Check status
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
