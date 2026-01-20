import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Handshake,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export default function InvestorTrack() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInvestorDialog, setShowInvestorDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [showReport, setShowReport] = useState(null);
  const [showPendingThanks, setShowPendingThanks] = useState(false);

  const [investorForm, setInvestorForm] = useState({
    name: "",
    business: "",
    email: "",
    phone: "",
    address: "",
    category: "Investor",
    investor_level: "Friend"
  });

  const [transactionForm, setTransactionForm] = useState({
    transaction_type: "donation",
    amount: "",
    event_name: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const { data: investors = [], isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: () => apiFetch("/investors")
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["investor_transactions"],
    queryFn: () => apiFetch("/investor-transactions")
  });

  const calculateInvestorLevel = (amount) => {
    if (amount >= 5000) return "Partner";
    if (amount >= 1000) return "Fellow";
    if (amount >= 500) return "Patron";
    return "Friend";
  };

  const saveInvestorMutation = useMutation({
    mutationFn: (data) =>
      selectedInvestor
        ? apiFetch(`/investors/${selectedInvestor.id}`, {
            method: "PUT",
            body: JSON.stringify(data)
          })
        : apiFetch("/investors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast.success("Investor saved");
      setShowInvestorDialog(false);
      setSelectedInvestor(null);
    }
  });

  const saveTransactionMutation = useMutation({
    mutationFn: async (data) => {
      const transaction = await apiFetch("/investor-transactions", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          investor_id: selectedInvestor.id,
          investor_name: selectedInvestor.name
        })
      });

      const oneYearAgo = subDays(new Date(), 365);
      const recentTransactions = transactions.filter(
        (t) =>
          t.investor_id === selectedInvestor.id &&
          new Date(t.transaction_date) >= oneYearAgo
      );

      const recentTotal =
        recentTransactions.reduce(
          (sum, t) => sum + Number(t.amount || 0),
          0
        ) + Number(data.amount || 0);

      const updates = {
        total_contributed:
          Number(selectedInvestor.total_contributed || 0) +
          Number(data.amount || 0),
        last_transaction_date: data.transaction_date
      };

      if (selectedInvestor.category === "Investor") {
        updates.investor_level = calculateInvestorLevel(recentTotal);
      }

      await apiFetch(`/investors/${selectedInvestor.id}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor_transactions"] });
      toast.success("Transaction recorded");
      setShowTransactionDialog(false);
      setSelectedInvestor(null);
    }
  });

  const markThankYouMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/investor-transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ thank_you_sent: true })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["investor_transactions"]
      });
      toast.success("Marked as thanked");
    }
  });

  const filteredInvestors = investors.filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.business || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || inv.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getInvestorTransactions = (id) =>
    transactions.filter((t) => t.investor_id === id);

  const getPendingThankYous = () =>
    transactions.filter((t) => !t.thank_you_sent);

  const getNewInvestorsReport = () => {
    const cutoffDate = subDays(new Date(), 45);
    const oneYearAgo = subDays(new Date(), 365);
    const fortyFiveDaysAgo = subDays(new Date(), 45);

    return investors.filter((inv) => {
      if (inv.created_date && new Date(inv.created_date) >= cutoffDate) {
        return true;
      }

      if (inv.category === "Investor") {
        const investorTransactions = transactions.filter(
          (t) => t.investor_id === inv.id
        );
        const transactionsBeforeCutoff = investorTransactions.filter((t) => {
          const transDate = new Date(t.transaction_date);
          return transDate >= oneYearAgo && transDate < fortyFiveDaysAgo;
        });
        const amountBeforeCutoff = transactionsBeforeCutoff.reduce(
          (sum, t) => sum + (Number(t.amount) || 0),
          0
        );
        const levelBeforeCutoff = calculateInvestorLevel(amountBeforeCutoff);

        const recentTransactions = investorTransactions.filter(
          (t) => new Date(t.transaction_date) >= oneYearAgo
        );
        const recentAmount = recentTransactions.reduce(
          (sum, t) => sum + (Number(t.amount) || 0),
          0
        );
        const currentLevel = calculateInvestorLevel(recentAmount);

        if (levelBeforeCutoff !== currentLevel) {
          return true;
        }
      }

      return false;
    });
  };

  const getInactiveInvestorsReport = () => {
    const cutoffDate = subDays(new Date(), 365);
    return investors.filter(
      (inv) => !inv.last_transaction_date || new Date(inv.last_transaction_date) < cutoffDate
    );
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading…</div>;

  const categoryColors = {
    Investor: "bg-blue-100 text-blue-800 border-blue-200",
    Sponsor: "bg-purple-100 text-purple-800 border-purple-200",
    "Business Partner": "bg-green-100 text-green-800 border-green-200",
  };

  const levelColors = {
    Friend: "bg-slate-100 text-slate-700",
    Patron: "bg-amber-100 text-amber-700",
    Fellow: "bg-orange-100 text-orange-700",
    Partner: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-[#2d4650] dark:text-slate-100">
              <Handshake className="w-10 h-10" />
              InvestorTrack
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Manage investors, sponsors, and business partners</p>
          </div>
          <Button
            size="lg"
            className="text-white gap-2 shadow-lg"
            style={{ backgroundColor: "#835879" }}
            onClick={() => {
              setSelectedInvestor(null);
              setInvestorForm({
                name: "",
                business: "",
                email: "",
                phone: "",
                address: "",
                category: "Investor",
                investor_level: "Friend"
              });
              setShowInvestorDialog(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Add Investor
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Investors</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{investors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">New (45 days)</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{getNewInvestorsReport().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Inactive (1 year)</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{getInactiveInvestorsReport().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className="bg-white/80 backdrop-blur-sm border-slate-200 cursor-pointer hover:shadow-lg transition-shadow dark:bg-slate-900/80 dark:border-slate-800"
            onClick={() => setShowPendingThanks(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Pending Thanks</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{getPendingThankYous().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or business..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Investor">Investors</SelectItem>
                    <SelectItem value="Sponsor">Sponsors</SelectItem>
                    <SelectItem value="Business Partner">Business Partners</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowReport("new")} className="flex-1 sm:flex-none">
                  <FileText className="w-4 h-4 mr-2" />
                  New Investors
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowReport("inactive")} className="flex-1 sm:flex-none">
                  <FileText className="w-4 h-4 mr-2" />
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filteredInvestors.map((inv) => {
            const invTx = getInvestorTransactions(inv.id);
            const pending = invTx.filter((t) => !t.thank_you_sent).length;

            return (
              <Card key={inv.id} className="bg-white/80 backdrop-blur-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{inv.name}</h3>
                          {inv.business && <p className="text-slate-600 dark:text-slate-400">{inv.business}</p>}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className={categoryColors[inv.category] || ""}>{inv.category}</Badge>
                            {inv.investor_level && (
                              <Badge variant="outline" className={levelColors[inv.investor_level] || ""}>
                                {inv.investor_level}
                              </Badge>
                            )}
                            {pending > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {pending} Pending Thank You{pending > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                        {inv.email && <p>📧 {inv.email}</p>}
                        {inv.phone && <p>📞 {inv.phone}</p>}
                        {inv.address && <p>📍 {inv.address}</p>}
                        {inv.last_transaction_date && (
                          <p>📅 Last activity: {format(new Date(inv.last_transaction_date), "MMM d, yyyy")}</p>
                        )}
                      </div>
                      {inv.total_contributed > 0 && (
                        <p className="mt-2 text-lg font-semibold text-[#835879]">
                          Total Contributed: ${Number(inv.total_contributed).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvestor(inv);
                          setInvestorForm(inv);
                          setShowInvestorDialog(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        style={{ backgroundColor: "#835879" }}
                        className="text-white"
                        onClick={() => {
                          setSelectedInvestor(inv);
                          const defaultType =
                            inv.category === "Investor"
                              ? "donation"
                              : inv.category === "Sponsor"
                              ? "sponsorship"
                              : "partnership";
                          setTransactionForm({
                            transaction_type: defaultType,
                            amount: "",
                            event_name: "",
                            transaction_date: new Date().toISOString().split("T")[0],
                            notes: ""
                          });
                          setShowTransactionDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Transaction
                      </Button>
                    </div>
                  </div>

                  {invTx.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Recent Transactions</h4>
                      <div className="space-y-2">
                        {invTx.slice(0, 3).map((trans) => (
                          <div key={trans.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium capitalize">{trans.transaction_type}</span>
                                {trans.amount && <span className="text-sm font-semibold text-[#835879]">${Number(trans.amount).toLocaleString()}</span>}
                                {trans.event_name && <span className="text-xs text-slate-500">• {trans.event_name}</span>}
                              </div>
                              <p className="text-xs text-slate-500">{format(new Date(trans.transaction_date), "MMM d, yyyy")}</p>
                            </div>
                            {!trans.thank_you_sent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markThankYouMutation.mutate(trans.id)}
                                className="text-xs"
                              >
                                Mark Thanked
                              </Button>
                            )}
                            {trans.thank_you_sent && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Investor Dialog */}
      <Dialog open={showInvestorDialog} onOpenChange={setShowInvestorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInvestor ? "Edit Investor" : "Add New Investor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={investorForm.name}
                  onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Business</Label>
                <Input
                  value={investorForm.business || ""}
                  onChange={(e) => setInvestorForm({ ...investorForm, business: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={investorForm.email || ""}
                  onChange={(e) => setInvestorForm({ ...investorForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={investorForm.phone || ""}
                  onChange={(e) => setInvestorForm({ ...investorForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={investorForm.address || ""}
                onChange={(e) => setInvestorForm({ ...investorForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={investorForm.category}
                  onValueChange={(val) => setInvestorForm({ ...investorForm, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Investor">Investor</SelectItem>
                    <SelectItem value="Sponsor">Sponsor</SelectItem>
                    <SelectItem value="Business Partner">Business Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {investorForm.category === "Investor" && (
                <div className="space-y-2">
                  <Label>Investor Level</Label>
                  <Select
                    value={investorForm.investor_level || "Friend"}
                    onValueChange={(val) => setInvestorForm({ ...investorForm, investor_level: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Patron">Patron</SelectItem>
                      <SelectItem value="Fellow">Fellow</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvestorDialog(false)}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: "#835879" }}
              className="text-white"
              onClick={() => saveInvestorMutation.mutate(investorForm)}
              disabled={!investorForm.name}
            >
              Save Investor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction for {selectedInvestor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={transactionForm.transaction_type}
                onValueChange={(val) =>
                  setTransactionForm({ ...transactionForm, transaction_type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={transactionForm.amount}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                value={transactionForm.event_name || ""}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, event_name: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={transactionForm.transaction_date}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, transaction_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={transactionForm.notes || ""}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: "#835879" }}
              className="text-white"
              onClick={() => saveTransactionMutation.mutate(transactionForm)}
            >
              Save Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={!!showReport} onOpenChange={(open) => !open && setShowReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showReport === "new" ? "New Investors (Last 45 Days)" : "Inactive Investors (1+ Year)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(showReport === "new" ? getNewInvestorsReport() : getInactiveInvestorsReport()).map((inv) => (
              <Card key={inv.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-800">{inv.name}</h4>
                    {inv.business && <p className="text-sm text-slate-600">{inv.business}</p>}
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className={categoryColors[inv.category] || ""}>{inv.category}</Badge>
                      {inv.investor_level && (
                        <Badge variant="outline" className={levelColors[inv.investor_level] || ""}>{inv.investor_level}</Badge>
                      )}
                    </div>
                    {inv.last_transaction_date && (
                      <p className="text-xs text-slate-500 mt-1">
                        Last: {format(new Date(inv.last_transaction_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {inv.total_contributed > 0 && (
                      <p className="font-semibold text-[#835879]">${Number(inv.total_contributed).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Thank Yous Dialog */}
      <Dialog open={showPendingThanks} onOpenChange={setShowPendingThanks}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pending Thank You Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {getPendingThankYous().map((trans) => {
              const investor = investors.find((inv) => inv.id === trans.investor_id);
              return (
                <Card key={trans.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{trans.investor_name}</h4>
                      {investor?.business && <p className="text-sm text-slate-600">{investor.business}</p>}
                      {investor?.address && <p className="text-sm text-slate-600">📍 {investor.address}</p>}
                      <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                        <span className="capitalize">{trans.transaction_type}</span>
                        {trans.amount && <span className="font-semibold text-[#835879]">${Number(trans.amount).toLocaleString()}</span>}
                        {trans.event_name && <span>• {trans.event_name}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(trans.transaction_date), "MMM d, yyyy")}
                      </p>
                      {trans.notes && <p className="text-sm text-slate-600 mt-2">{trans.notes}</p>}
                    </div>
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#835879" }}
                      className="text-white"
                      onClick={() => markThankYouMutation.mutate(trans.id)}
                    >
                      Mark Thanked
                    </Button>
                  </div>
                </Card>
              );
            })}
            {getPendingThankYous().length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>All thank you notes have been sent!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
