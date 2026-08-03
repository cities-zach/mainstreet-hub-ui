import { API_BASE, buildAuthHeaders } from "@/api";

export async function uploadFile({
  file,
  visibility = "private",
  purpose = "internal-attachment",
  publicSurvey = null,
}) {
  if (!file) throw new Error("No file provided");
  const body = new FormData();
  body.append("file", file, file.name || "file");
  const path = publicSurvey
    ? `/public/surveys/${publicSurvey.surveyId}/questions/${publicSurvey.questionId}/files`
    : `/files/${visibility === "public" ? "public" : "private"}?purpose=${encodeURIComponent(purpose)}`;
  const headers = publicSurvey
    ? new Headers({ "x-org-slug": "ottumwa" })
    : await buildAuthHeaders();
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Upload failed (${response.status})`);
  return data;
}

export const uploadPublicFile = uploadFile;

export function secureFileId(url) {
  return String(url || "").match(/\/files\/([0-9a-f-]{36})\/download(?:\?|$)/i)?.[1] || null;
}
