import React, { useMemo, useState } from "react";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function PolicyAcceptanceModal({
  isOpen,
  policyVersions,
  onAccepted,
}) {
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => acceptedPrivacy && acceptedTerms,
    [acceptedPrivacy, acceptedTerms]
  );

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch("/policies/accept", { method: "POST" });
      toast.success("Thanks for accepting the latest policies.");
      onAccepted?.();
    } catch (error) {
      toast.error(error?.message || "Failed to save acceptance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">
          Updated policies
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Please review and accept the latest Privacy Policy and Terms of
          Service to continue using MainSuite.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={acceptedPrivacy}
              onCheckedChange={(value) => setAcceptedPrivacy(Boolean(value))}
            />
            <span>
              I agree to the{" "}
              <a
                className="text-[#835879] underline"
                href="/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              {policyVersions?.privacy_policy_version
                ? ` (version ${policyVersions.privacy_policy_version})`
                : ""}
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
              <a
                className="text-[#835879] underline"
                href="/terms"
                target="_blank"
                rel="noreferrer"
              >
                Terms of Service
              </a>
              {policyVersions?.terms_of_service_version
                ? ` (version ${policyVersions.terms_of_service_version})`
                : ""}
              .
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            className="bg-[#835879] text-white"
            disabled={!canSubmit || submitting}
            onClick={handleAccept}
          >
            {submitting ? "Saving..." : "Accept and continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
