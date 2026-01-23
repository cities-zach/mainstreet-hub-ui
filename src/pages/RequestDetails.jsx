import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RequestDetailsHeader from "@/components/request/RequestDetailsHeader";
import RequestDetailsInfo from "@/components/request/RequestDetailsInfo";
import MaterialsSection from "@/components/request/MaterialsSection";
import CommentsSection from "@/components/request/CommentsSection";

export default function RequestDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("id");
  const [user, setUser] = useState(null);

  // Load current user (if available)
  useEffect(() => {
    apiFetch("/me")
      .then(data => setUser(data?.user || null))
      .catch(() => {});
  }, []);

  // Fetch request
  const { data: request, isLoading: requestLoading } = useQuery({
    queryKey: ["marketing_request", requestId],
    queryFn: () => apiFetch(`/marketing-requests/${requestId}`),
    enabled: !!requestId
  });

  // Fetch materials
  const { data: materials = [] } = useQuery({
    queryKey: ["materials", requestId],
    queryFn: () => apiFetch(`/materials?request_id=${requestId}`),
    enabled: !!requestId
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["request_comments", requestId],
    queryFn: () => apiFetch(`/request-comments?request_id=${requestId}`),
    enabled: !!requestId
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) =>
      apiFetch(`/marketing-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["marketing_requests"] });
    }
  });

  if (requestLoading || !request) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 border-[#835879]" />
          <p className="text-slate-500 dark:text-slate-400">Loading request...</p>
        </div>
      </div>
    );
  }

  const isRequester =
    user &&
    user.email &&
    request.created_by &&
    user.email.toLowerCase() === request.created_by.toLowerCase();
  const isAdmin = user && (user.role === "admin" || user.role === "super_admin");
  const canUploadMaterials = isAdmin || isRequester;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/marketstreet")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#2d4650] dark:text-slate-100">
              {request.event_name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Marketing Request Details</p>
          </div>
        </div>

        <RequestDetailsHeader
          request={request}
          updateRequestMutation={updateRequestMutation}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RequestDetailsInfo request={request} />
            <MaterialsSection
              request={request}
              materials={materials}
              isRequester={isRequester}
              canUploadMaterials={canUploadMaterials}
            />
          </div>

          <div>
            <CommentsSection
              requestId={requestId}
              comments={comments}
              user={user}
              request={request}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
