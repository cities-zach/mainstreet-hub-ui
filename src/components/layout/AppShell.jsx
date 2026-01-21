import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Bot,
  ClipboardList,
  DollarSign,
  Home,
  LineChart,
  PanelLeft,
  PanelRight,
  Map,
  Mic,
  BookOpen,
  Package,
  Settings,
  Store,
  Users,
  CheckSquare,
} from "lucide-react";
import AIChatPanel from "@/components/ai/AIChatPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "MasterPlanner", to: "/master-planner", icon: Map },
  { label: "NoteTaker", to: "/meeting-notes", icon: Mic },
  { label: "MarketStreet", to: "/marketstreet", icon: Store },
  { label: "TaskMaster", to: "/taskmaster", icon: CheckSquare },
  { label: "PocketBook", to: "/pocketbook", icon: DollarSign },
  { label: "SupplyStop", to: "/supplystop", icon: Package },
  { label: "TeamBuilder", to: "/teambuilder", icon: Users },
  { label: "FeedBack", to: "/feedback", icon: ClipboardList },
  { label: "InvestorTrack", to: "/investors", icon: LineChart },
  { label: "RAGTime", to: "/ragtime", icon: BookOpen },
];

export default function AppShell({ me }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);

  const organization = me?.organization;
  const orgName = organization?.name || "MainStreet";

  const navClass = ({ isActive }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-[#835879]/10 text-[#835879]"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    );

  const navRows = navItems.map((item) => (
    <NavLink key={item.to} to={item.to} className={navClass}>
      <item.icon className="w-4 h-4" />
      {item.label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <PanelLeft className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-3">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={`${orgName} logo`}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#835879]/20 flex items-center justify-center text-[#835879] font-semibold">
                {orgName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm text-slate-500">Organization</div>
              <div className="font-semibold leading-tight">{orgName}</div>
            </div>
          </Link>
        </div>

        <Link to="/" className="flex items-center gap-2 text-[#2d4650]">
          <div className="w-9 h-9 rounded-xl bg-[#835879]/15 flex items-center justify-center text-[#835879] font-bold">
            MS
          </div>
          <div>
            <div className="text-xs text-slate-500">MainSuite</div>
            <div className="font-semibold">Dashboard</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant={chatOpen ? "ghost" : "default"}
            className={cn(
              "gap-2",
              chatOpen ? "text-slate-600" : "bg-[#835879] text-white"
            )}
            onClick={() => setChatOpen((prev) => !prev)}
          >
            <Bot className="w-4 h-4" />
            {chatOpen ? "Hide Fred" : "Open Fred"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600"
            onClick={() => setChatOpen((prev) => !prev)}
          >
            <PanelRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            "border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur transition-all duration-300",
            sidebarOpen ? "w-64" : "w-0"
          )}
        >
          {sidebarOpen && (
            <div className="h-full flex flex-col px-4 py-6 gap-6">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Suite Modules
              </div>
              <nav className="flex flex-col gap-2">{navRows}</nav>
              <div className="mt-auto text-xs text-slate-400">
                MainSuite v2.1
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
