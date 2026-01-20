import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Download,
  Pencil,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export default function BudgetDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const budgetId = searchParams.get("id");
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Fetch Budget
  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ["budget", budgetId],
    queryFn: () => apiFetch(`/budgets/${budgetId}`),
    enabled: !!budgetId,
  });

  // Fetch Line Items
  const { data: lineItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["budget_items", budgetId],
    queryFn: () => apiFetch(`/budget-line-items?event_id=${budgetId}`),
    enabled: !!budgetId,
  });

  // Mutations
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) =>
      apiFetch(`/budget-line-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_items", budgetId] });
      toast.success("Line item updated");
      setEditingItem(null);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: data =>
      apiFetch("/budget-line-items", {
        method: "POST",
        body: JSON.stringify({ ...data, event_id: budgetId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_items", budgetId] });
      toast.success("Line item added");
      setIsAddDialogOpen(false);
    },
  });

  const handleSaveEdit = id => {
    updateItemMutation.mutate({
      id,
      data: {
        actual_amount: Number(editValues.actual_amount),
        notes: editValues.notes,
      },
    });
  };

  const handleExport = () => {
    if (!lineItems || !budget) return;

    const headers = [
      "Category",
      "Type",
      "Item",
      "Projected Amount",
      "Actual Amount",
      "Variance",
      "Notes",
    ];

    const rows = lineItems.map(item => [
      item.category,
      item.type,
      `"${item.item.replace(/"/g, '""')}"`,
      item.estimated_amount,
      item.actual_amount,
      item.actual_amount - item.estimated_amount,
      `"${(item.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join(
      "\n"
    );

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${budget.event_name.replace(/\s+/g, "_")}_Budget_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const revenueItems = lineItems.filter(i => i.category === "Revenue");
  const expenseItems = lineItems.filter(i => i.category === "Expense");

  const totalRevenueActual = revenueItems.reduce(
    (sum, i) => sum + (Number(i.actual_amount) || 0),
    0
  );
  const totalExpensesActual = expenseItems.reduce(
    (sum, i) => sum + (Number(i.actual_amount) || 0),
    0
  );

  const formatCurrency = amount =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);

  if (budgetLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!budget) return <div>Budget not found</div>;

  const LineItemTable = ({ items, type }) => (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Projected</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => {
            const isEditing = editingItem === item.id;
            const variance =
              (Number(item.actual_amount) || 0) -
              (Number(item.estimated_amount) || 0);
            const isGood =
              type === "Revenue" ? variance >= 0 : variance <= 0;

            return (
              <TableRow key={item.id}>
                <TableCell>{item.item}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.estimated_amount)}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      className="w-24 ml-auto text-right h-8"
                      value={editValues.actual_amount}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          actual_amount: e.target.value,
                        })
                      }
                    />
                  ) : (
                    formatCurrency(item.actual_amount)
                  )}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    variance === 0
                      ? "text-slate-400"
                      : isGood
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(variance)}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editValues.notes}
                      onChange={e =>
                        setEditValues({
                          ...editValues,
                          notes: e.target.value,
                        })
                      }
                    />
                  ) : (
                    item.notes
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEdit(item.id)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingItem(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingItem(item.id);
                        setEditValues({
                          actual_amount: item.actual_amount,
                          notes: item.notes || "",
                        });
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 italic">
                No items found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/pocketbook")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#2d4650] dark:text-slate-100">{budget.event_name}</h1>
            <p className="text-slate-500 dark:text-slate-400">Budget Details & Actuals</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" /> Export Report
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-[#835879] hover:bg-[#6d4a64] text-white gap-2">
              <Plus className="w-4 h-4" /> Add Line Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Total Revenue (Actual)</p>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-300" />
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(totalRevenueActual)}</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Projected: {formatCurrency(budget.total_revenue_projected)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Total Expenses (Actual)</p>
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-300" />
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalExpensesActual)}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Projected: {formatCurrency(budget.total_expenses_projected)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Net Income (Actual)</p>
                <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <p className={`text-2xl font-bold ${(totalRevenueActual - totalExpensesActual) >= 0 ? 'text-[#2d4650] dark:text-slate-100' : 'text-red-600 dark:text-red-300'}`}>
                {formatCurrency(totalRevenueActual - totalExpensesActual)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Projected: {formatCurrency(budget.net_income_projected ?? (budget.total_revenue_projected - budget.total_expenses_projected))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs defaultValue="expenses" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
              </TabsList>
              <TabsContent value="expenses">
                <LineItemTable items={expenseItems} type="Expense" />
              </TabsContent>
              <TabsContent value="revenue">
                <LineItemTable items={revenueItems} type="Revenue" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <AddItemDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={createItemMutation.mutate}
          isLoading={createItemMutation.isPending}
        />
      </div>
    </div>
  );
}

function AddItemDialog({ open, onOpenChange, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    category: "Expense",
    type: "Other",
    item: "",
    estimated_amount: 0,
    actual_amount: 0,
    notes: "",
  });

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({
      ...formData,
      estimated_amount: Number(formData.estimated_amount),
      actual_amount: Number(formData.actual_amount),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            value={formData.category}
            onValueChange={val =>
              setFormData({ ...formData, category: val })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Revenue">Revenue</SelectItem>
              <SelectItem value="Expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Item name"
            value={formData.item}
            onChange={e =>
              setFormData({ ...formData, item: e.target.value })
            }
            required
          />

          <Input
            placeholder="Type"
            value={formData.type}
            onChange={e =>
              setFormData({ ...formData, type: e.target.value })
            }
          />

          <Input
            type="number"
            placeholder="Actual amount"
            value={formData.actual_amount}
            onChange={e =>
              setFormData({ ...formData, actual_amount: e.target.value })
            }
            required
          />

          <Textarea
            placeholder="Notes"
            value={formData.notes}
            onChange={e =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
