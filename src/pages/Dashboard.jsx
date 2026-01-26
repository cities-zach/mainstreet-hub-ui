import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Map,
  Store,
  CheckSquare,
  DollarSign,
  Package,
  Users,
  ClipboardList,
  LineChart,
  Mic,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ThreeMonthCalendar from "@/components/dashboard/ThreeMonthCalendar";
import { apiFetch } from "@/api";

const ModuleCard = ({ title, description, icon: Icon, url, color }) => (
  <Link to={url}>
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-slate-200 dark:border-slate-800 group">
      <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function Dashboard({ me }) {
  const isAdmin =
    me?.user?.role === "admin" ||
    me?.user?.role === "super_admin" ||
    me?.user?.app_role === "admin" ||
    me?.user?.app_role === "super_admin";
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch("/events"),
  });

  const modules = [
    {
      title: "MasterPlanner",
      description: "Plan new events, create action plans, and coordinate resources.",
      icon: Map,
      url: "/master-planner",
      color: "#835879",
    },
    {
      title: "MarketStreet",
      description: "Manage marketing requests, materials, and content production.",
      icon: Store,
      url: "/marketstreet",
      color: "#ffc93e",
    },
    {
      title: "TaskMaster",
      description: "Track tasks, deadlines, and team responsibilities.",
      icon: CheckSquare,
      url: "/taskmaster",
      color: "#2d4650",
    },
    {
      title: "PocketBook",
      description: "Monitor event budgets, expenses, and financial health.",
      icon: DollarSign,
      url: "/pocketbook",
      color: "#979b80",
    },
    {
      title: "SupplyStop",
      description: "Manage equipment inventory and check-out process.",
      icon: Package,
      url: "/supplystop",
      color: "#610345",
    },
    {
      title: "TeamBuilder",
      description: "Recruit and manage volunteers for your events.",
      icon: Users,
      url: "/teambuilder",
      color: "#e11d48",
    },
    {
      title: "FeedBack",
      description: "Create surveys and collect feedback from participants.",
      icon: ClipboardList,
      url: "/feedback",
      color: "#0891b2",
    },
    {
      title: "InvestorTrack",
      description: "Track supporters, gifts, and investor engagement.",
      icon: LineChart,
      url: "/investors",
      color: "#6366f1",
    },
    ...(isAdmin
      ? [
          {
            title: "WheelSpin",
            description: "Run weighted prize wheels and track winners.",
            icon: Sparkles,
            url: "/wheelspin",
            color: "#835879",
          },
        ]
      : []),
    {
      title: "NoteTaker",
      description: "Upload meetings, review notes, and create tasks.",
      icon: Mic,
      url: "/meeting-notes",
      color: "#10b981",
    },
    {
      title: "RAGTime",
      description: "Manage the knowledge base that powers Fred.",
      icon: BookOpen,
      url: "/ragtime",
      color: "#f97316",
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-slate-100">
            MainSuite Ottumwa
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Welcome to your comprehensive event management suite
          </p>
        </div>

        <ThreeMonthCalendar events={events} />

        <div>
          <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
            Management Modules
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
