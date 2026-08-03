import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BulkPasteDialog from "@/components/masterplanner/BulkPasteDialog";
import ReorderableList from "@/components/masterplanner/ReorderableList";

const FUNDING_TYPES = [
  "Grant",
  "Sponsorship",
  "Ticket Sales",
  "Vendor Fees",
  "Product Sales",
  "Concessions",
  "Other",
];
const EXPENSE_TYPES = [
  "Venue",
  "Food and Beverage",
  "Technology",
  "Equipment",
  "Marketing",
  "Staffing",
  "Talent",
  "Other",
];

const FINANCE_COLUMNS = [
  { key: "type", label: "Type" },
  { key: "item", label: "Item" },
  { key: "per_unit", label: "Per unit or TBD" },
  { key: "quantity", label: "Quantity or TBD" },
  { key: "notes", label: "Notes" },
];

export default function FinanceSection({ data, onChange, readOnly }) {
  const fundingSources = data.funding_sources || [];
  const projectedExpenses = data.projected_expenses || [];

  const toNumber = (val) => {
    if (val === undefined || val === null || val === "") return 0;
    const n = typeof val === "number" ? val : parseFloat(String(val));
    return Number.isFinite(n) ? n : 0;
  };

  const computeLineTotal = (item) => {
    if (
      String(item?.per_unit || "").toUpperCase() === "TBD" ||
      String(item?.quantity || "").toUpperCase() === "TBD"
    ) {
      return null;
    }
    // Prefer stored total if present, but fall back to per_unit * quantity
    const stored = toNumber(item?.total);
    if (stored) return stored;

    const pUnit = toNumber(item?.per_unit);
    const qty = toNumber(item?.quantity);
    return pUnit * qty;
  };

  // Calculations
  const totalRevenue = fundingSources.reduce(
    (sum, item) => sum + (computeLineTotal(item) || 0),
    0
  );
  const totalExpenses = projectedExpenses.reduce(
    (sum, item) => sum + (computeLineTotal(item) || 0),
    0
  );
  const netIncome = totalRevenue - totalExpenses;

  // --- Helpers ---
  const formatCurrency = (value) => {
    if (value === null) return "TBD";
    const n = toNumber(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  // --- Funding Logic ---
  const addFundingSource = () => {
    const newItem = {
      _row_id: globalThis.crypto.randomUUID(),
      type: "",
      item: "",
      per_unit: "TBD",
      quantity: "TBD",
      total: "TBD",
      notes: "",
    };
    onChange({ funding_sources: [...fundingSources, newItem] });
  };

  const updateFundingSource = (index, field, value) => {
    const updated = [...fundingSources];
    let item = { ...updated[index] };

    if (field === "per_unit" || field === "quantity") {
      const cleanVal = String(value).replace(/-/g, "");
      item[field] = cleanVal;

      const pUnit = parseFloat(field === "per_unit" ? cleanVal : item.per_unit) || 0;
      const qty = parseFloat(field === "quantity" ? cleanVal : item.quantity) || 0;
      item.total =
        String(cleanVal).toUpperCase() === "TBD" ||
        String(field === "per_unit" ? item.quantity : item.per_unit).toUpperCase() === "TBD"
          ? "TBD"
          : pUnit * qty;
    } else {
      item[field] = value;
    }

    updated[index] = item;
    onChange({ funding_sources: updated });
  };

  const removeFundingSource = (index) => {
    onChange({ funding_sources: fundingSources.filter((_, i) => i !== index) });
  };

  // --- Expense Logic ---
  const addExpense = () => {
    const newItem = {
      _row_id: globalThis.crypto.randomUUID(),
      type: "",
      item: "",
      per_unit: "TBD",
      quantity: "TBD",
      total: "TBD",
      notes: "",
    };
    onChange({ projected_expenses: [...projectedExpenses, newItem] });
  };

  const updateExpense = (index, field, value) => {
    const updated = [...projectedExpenses];
    let item = { ...updated[index] };

    if (field === "per_unit" || field === "quantity") {
      const cleanVal = String(value).replace(/-/g, "");
      item[field] = cleanVal;

      const pUnit = parseFloat(field === "per_unit" ? cleanVal : item.per_unit) || 0;
      const qty = parseFloat(field === "quantity" ? cleanVal : item.quantity) || 0;
      item.total =
        String(cleanVal).toUpperCase() === "TBD" ||
        String(field === "per_unit" ? item.quantity : item.per_unit).toUpperCase() === "TBD"
          ? "TBD"
          : pUnit * qty;
    } else {
      item[field] = value;
    }

    updated[index] = item;
    onChange({ projected_expenses: updated });
  };

  const removeExpense = (index) => {
    onChange({
      projected_expenses: projectedExpenses.filter((_, i) => i !== index),
    });
  };

  const prepareFinanceRows = (rows) =>
    rows.map((row) => {
      const perUnit = Number(row.per_unit);
      const quantity = Number(row.quantity);
      const unresolved =
        String(row.per_unit).toUpperCase() === "TBD" ||
        String(row.quantity).toUpperCase() === "TBD";
      return {
        ...row,
        total:
          unresolved || !Number.isFinite(perUnit) || !Number.isFinite(quantity)
            ? "TBD"
            : perUnit * quantity,
      };
    });

  return (
    <div className="space-y-12 max-w-6xl">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Label className="text-green-600 mb-2 font-semibold">
              Total Revenue
            </Label>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Label className="text-red-600 mb-2 font-semibold">
              Total Expenses
            </Label>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${
            netIncome >= 0 ? "bg-slate-50 border-slate-200" : "bg-red-50 border-red-200"
          }`}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Label
              className={`mb-2 font-semibold ${
                netIncome < 0 ? "text-red-600" : "text-slate-600"
              }`}
            >
              Net Cost / Revenue
            </Label>
            <div
              className={`text-2xl font-bold ${
                netIncome > 0
                  ? "text-green-600"
                  : netIncome < 0
                  ? "text-red-600"
                  : "text-black"
              }`}
            >
              {formatCurrency(netIncome)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funding Sources */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-[#2d4650]">Funding Sources</h2>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <BulkPasteDialog
                title="Paste funding sources"
                columns={FINANCE_COLUMNS}
                onImport={(rows) =>
                  onChange({
                    funding_sources: [
                      ...fundingSources,
                      ...prepareFinanceRows(rows),
                    ],
                  })
                }
              />
              <Button
                onClick={addFundingSource}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" /> Add Funding
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ReorderableList
            items={fundingSources}
            disabled={readOnly}
            className="space-y-4"
            onReorder={(items) => onChange({ funding_sources: items })}
            renderItem={(item, index) => (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white p-4 pl-6 rounded-xl border border-slate-200 shadow-sm relative group">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Type</Label>
                <Select
                  value={item.type}
                  onValueChange={(val) => updateFundingSource(index, "type", val)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNDING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs text-slate-500">Item</Label>
                <Input
                  value={item.item}
                  onChange={(e) => updateFundingSource(index, "item", e.target.value)}
                  placeholder="Description"
                  disabled={readOnly}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Per Unit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={item.per_unit}
                    onChange={(e) => updateFundingSource(index, "per_unit", e.target.value)}
                    className="pl-6"
                    placeholder="0.00"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Qty</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(e) => updateFundingSource(index, "quantity", e.target.value)}
                  placeholder="0"
                  disabled={readOnly}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Total</Label>
                <div className="h-10 flex items-center px-3 bg-slate-50 rounded-md border border-slate-200 text-slate-700 font-medium">
                  {formatCurrency(item.total)}
                </div>
              </div>

              <div className="md:col-span-2 md:col-start-1 md:col-end-11 space-y-1">
                <Label className="text-xs text-slate-500">Notes</Label>
                <Input
                  value={item.notes}
                  onChange={(e) => updateFundingSource(index, "notes", e.target.value)}
                  placeholder="Additional details..."
                  disabled={readOnly}
                />
              </div>

              {!readOnly && (
                <Button
                  onClick={() => removeFundingSource(index)}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              </div>
            )}
          />

          {fundingSources.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
              No funding sources added yet.
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-[#2d4650]">Expenses</h2>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <BulkPasteDialog
                title="Paste expenses"
                columns={FINANCE_COLUMNS}
                onImport={(rows) =>
                  onChange({
                    projected_expenses: [
                      ...projectedExpenses,
                      ...prepareFinanceRows(rows),
                    ],
                  })
                }
              />
              <Button
                onClick={addExpense}
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ReorderableList
            items={projectedExpenses}
            disabled={readOnly}
            className="space-y-4"
            onReorder={(items) => onChange({ projected_expenses: items })}
            renderItem={(item, index) => (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white p-4 pl-6 rounded-xl border border-slate-200 shadow-sm relative group">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Type</Label>
                <Select
                  value={item.type}
                  onValueChange={(val) => updateExpense(index, "type", val)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs text-slate-500">Item</Label>
                <Input
                  value={item.item}
                  onChange={(e) => updateExpense(index, "item", e.target.value)}
                  placeholder="Description"
                  disabled={readOnly}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Per Unit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={item.per_unit}
                    onChange={(e) => updateExpense(index, "per_unit", e.target.value)}
                    className="pl-6"
                    placeholder="0.00"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Qty</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(e) => updateExpense(index, "quantity", e.target.value)}
                  placeholder="0"
                  disabled={readOnly}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500">Total</Label>
                <div className="h-10 flex items-center px-3 bg-slate-50 rounded-md border border-slate-200 text-slate-700 font-medium">
                  {formatCurrency(item.total)}
                </div>
              </div>

              <div className="md:col-span-2 md:col-start-1 md:col-end-11 space-y-1">
                <Label className="text-xs text-slate-500">Notes</Label>
                <Input
                  value={item.notes}
                  onChange={(e) => updateExpense(index, "notes", e.target.value)}
                  placeholder="Additional details..."
                  disabled={readOnly}
                />
              </div>

              {!readOnly && (
                <Button
                  onClick={() => removeExpense(index)}
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              </div>
            )}
          />

          {projectedExpenses.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
              No expenses added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
