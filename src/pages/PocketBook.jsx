import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2
} from "lucide-react";
import { apiFetch } from "@/api";

export default function PocketBook() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    apiFetch("/me")
      .then(res => setUser(res.user))
      .catch(() => {});
  }, []);

  // Fetch Budgets
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => apiFetch("/budgets")
  });

  // Fetch all budget line items (MVP behavior preserved)
  const { data: allLineItems = [] } = useQuery({
    queryKey: ["budget_line_items"],
    queryFn: () => apiFetch("/budget-line-items")
  });

  const getBudgetStats = (eventId) => {
    const items = allLineItems.filter(i => i.budget_id === eventId);

    const actualRevenue = items
      .filter(i => i.category === "Revenue")
      .reduce((sum, i) => sum + Number(i.actual_amount || 0), 0);

    const actualExpenses = items
      .filter(i => i.category === "Expense")
      .reduce((sum, i) => sum + Number(i.actual_amount || 0), 0);

    return {
      actualRevenue,
      actualExpenses,
      netActual: actualRevenue - actualExpenses
    };
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount || 0);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-[#2d4650]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <DollarSign className="w-10 h-10" />
              PocketBook
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Event budgeting and expense tracking
            </p>
          </div>
        </div>

        {budgets.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-dashed border-slate-300 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No Budgets Found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Budgets are created when an Event Plan is approved in
                MasterPlanner.
              </p>
              <Button
                className="mt-6"
                variant="outline"
                onClick={() => navigate("/master-planner")}
              >
                Go to MasterPlanner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map(budget => {
              const stats = getBudgetStats(budget.id);

              const percentSpent =
                budget.total_expenses_projected > 0
                  ? (stats.actualExpenses /
                      budget.total_expenses_projected) *
                    100
                  : 0;

              return (
                <Card
                  key={budget.id}
                  className="bg-white/90 dark:bg-slate-900/90"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="outline">
                        {budget.status === "active"
                          ? "Active"
                          : "Closed"}
                      </Badge>

                      {budget.status === "active" &&
                        percentSpent > 100 && (
                          <Badge className="bg-red-100 text-red-700">
                            Over Budget
                          </Badge>
                        )}
                    </div>

                    <CardTitle className="text-xl font-bold">
                      {budget.event_name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          Revenue
                        </span>
                        <span className="text-green-700">
                          {formatCurrency(stats.actualRevenue)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Projected:{" "}
                        {formatCurrency(
                          budget.total_revenue_projected
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-red-600" />
                          Expenses
                        </span>
                        <span className="text-red-700">
                          {formatCurrency(stats.actualExpenses)}
                        </span>
                      </div>

                      <Progress
                        value={Math.min(percentSpent, 100)}
                        className="h-2"
                      />

                      <div className="flex justify-between text-xs text-slate-400">
                        <span>
                          Projected:{" "}
                          {formatCurrency(
                            budget.total_expenses_projected
                          )}
                        </span>
                        <span>{Math.round(percentSpent)}% used</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex justify-between">
                      <span className="text-sm font-medium">
                        Net Income
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          stats.netActual >= 0
                            ? "text-[#2d4650]"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(stats.netActual)}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() =>
                        navigate(`/budget-details?id=${budget.id}`)
                      }
                    >
                      Manage Budget
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
