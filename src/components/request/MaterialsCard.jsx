import { Card, CardContent } from "@/components/ui/card";

export default function MaterialsCard({ material }) {
  if (!material) return null;

  const title = material.file_name || material.material_type || "Untitled Material";
  const description = material.notes || "";

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
      <CardContent className="p-4 space-y-1">
        <div className="font-medium text-slate-800 dark:text-slate-100">
          {title}
        </div>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
        {material.file_url && (
          <a
            href={material.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#835879] underline"
          >
            View file
          </a>
        )}
      </CardContent>
    </Card>
  );
}
