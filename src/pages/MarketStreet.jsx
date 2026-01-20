import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Store } from "lucide-react";
import RequestCard from "@/components/dashboard/RequestCard";
import StatsOverview from "@/components/dashboard/StatsOverview";
import WeeklyCalendar from "@/components/dashboard/WeeklyCalendar";

export default function MarketStreet() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["marketing_requests"],
    queryFn: () => apiFetch("/marketing-requests"),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => apiFetch("/materials"),
  });

  const filteredRequests =
    statusFilter === "all"
      ? requests
      : requests.filter(req => req.status === statusFilter);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    inProgress: requests.filter(r => r.status === "in_progress").length,
    review: requests.filter(r => r.status === "review").length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <Store className="w-10 h-10" />
              MarketStreet
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Manage marketing materials for Main Street Ottumwa
            </p>
          </div>

          <Link to="/marketstreet/new">
            <Button
              size="lg"
              className="text-white gap-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#835879]"
            >
              <Plus className="w-5 h-5" />
              New Request
            </Button>
          </Link>
        </div>

        <StatsOverview stats={stats} />

        <WeeklyCalendar materials={materials} requests={requests} />

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#2d4650] dark:text-slate-100">
              All Requests
            </h2>

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="h-48 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2 text-[#2d4650] dark:text-slate-100">
                No requests found
              </h3>
              <p className="mb-6 text-slate-500 dark:text-slate-400">
                Get started by creating your first marketing request
              </p>
              <Link to="/marketstreet/new">
                <Button className="bg-[#835879] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredRequests.map(request => (
                <RequestCard
                  key={request.id}
                  request={request}
                  materials={materials.filter(
                    m => m.request_id === request.id
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
