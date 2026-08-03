import { apiFetch } from "@/api";
import { secureFileId } from "@/lib/uploads";

export default function SecureFileLink({ href, children, className, ...props }) {
  const fileId = secureFileId(href);
  const handleClick = async (event) => {
    if (!fileId) return;
    event.preventDefault();
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const { url } = await apiFetch(`/files/${fileId}/url`);
      if (popup) popup.location = url;
      else window.location.assign(url);
    } catch (error) {
      popup?.close();
      throw error;
    }
  };
  return (
    <a href={href || "#"} target="_blank" rel="noopener noreferrer"
      className={className} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
