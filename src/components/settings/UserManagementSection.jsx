import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function UserManagementSection() {
  return (
    <Card className="bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#835879]" />
          Users & Teams
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage user roles, approvals, and reusable teams.
        </p>
        <div className="flex gap-2"><Link to="/settings/users"><Button variant="outline">Manage Users</Button></Link><Link to="/settings/teams"><Button className="bg-[#835879] hover:bg-[#6d4a64] text-white">Manage Teams</Button></Link></div>
      </CardContent>
    </Card>
  );
}
