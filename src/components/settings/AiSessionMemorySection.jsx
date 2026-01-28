import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";

export default function AiSessionMemorySection() {
  return (
    <Card className="bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-[#835879]" />
          AI Session Memory
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Review and adjust FRED&apos;s working memory across active sessions.
        </p>
        <Link to="/settings/ai-sessions">
          <Button className="bg-[#835879] hover:bg-[#6d4a64] text-white">
            Manage Sessions
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
