import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Bot,
  ClipboardList,
  DollarSign,
  Home,
  LineChart,
  PanelLeft,
  Map,
  Mic,
  BookOpen,
  Package,
  Settings,
  Store,
  Users,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import AIChatPanel from "@/components/ai/AIChatPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppShell({ me }) {
  const isAdmin =
    me?.user?.role === "admin" ||
    me?.user?.role === "super_admin" ||
    me?.user?.app_role === "admin" ||
    me?.user?.app_role === "super_admin";
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
    ...(isAdmin
      ? [{ label: "WheelSpin", to: "/wheelspin", icon: Sparkles }]
      : []),
    { label: "RAGTime", to: "/ragtime", icon: BookOpen },
  ];
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
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

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const navRows = navItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={navClass}
      onClick={handleNavClick}
    >
      <item.icon className="w-4 h-4" />
      {item.label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-3 w-full md:w-auto">
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
              <>
                <img
                  src={organization.logo_url}
                  alt={`${orgName} logo`}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    const fallback = event.currentTarget.nextSibling;
                    if (fallback?.style) fallback.style.display = "flex";
                  }}
                />
                <div
                  className="w-9 h-9 rounded-full bg-[#835879]/20 items-center justify-center text-[#835879] font-semibold hidden"
                  aria-hidden
                >
                  {orgName.slice(0, 1).toUpperCase()}
                </div>
              </>
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

        <Link
          to="/"
          className="hidden md:flex items-center gap-2 text-[#2d4650]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#835879]/15 flex items-center justify-center text-[#835879] font-bold">
            MS
          </div>
          <div>
            <div className="text-xs text-slate-500">MainSuite</div>
            <div className="font-semibold">Dashboard</div>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <Button
            variant={chatOpen ? "ghost" : "default"}
            className={cn(
              "gap-2 w-full sm:w-auto",
              chatOpen ? "text-slate-600" : "bg-[#835879] text-white"
            )}
            onClick={() => setChatOpen((prev) => !prev)}
          >
            <Bot className="w-4 h-4" />
            {chatOpen ? "Hide FRED" : "Open FRED"}
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <aside
          className={cn(
            "border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur transition-transform duration-300 md:transition-all",
            "fixed inset-y-0 left-0 z-40 w-64 md:static md:translate-x-0",
            sidebarOpen
              ? "translate-x-0 md:w-64"
              : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none"
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

        {chatOpen && (
          <div className="fixed bottom-4 right-2 left-2 sm:left-auto sm:right-4 z-50">
            <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
