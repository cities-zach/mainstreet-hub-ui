import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";

import InventoryForm from "@/components/supplystop/InventoryForm";
import InventoryList from "@/components/supplystop/InventoryList";
import RequisitionForm from "@/components/supplystop/RequisitionForm";
import RequisitionList from "@/components/supplystop/RequisitionList";
import InventoryHistory from "@/components/supplystop/InventoryHistory";
import ReturnsList from "@/components/supplystop/ReturnsList";
import AdminTools from "@/components/supplystop/AdminTools";
import { apiFetch } from "@/api";

/**
 * NOTE:
 * - `currentUser` and `isAdmin` are assumed to come from higher-level app state
 *   (auth context, layout loader, etc.)
 * - This keeps SupplyStop clean and testable
 */
export default function SupplyStop() {
  const [user, setUser] = useState(null);
  // Inventory dialog state
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // History dialog state
  const [historyItemId, setHistoryItemId] = useState(null);

  // Requisition dialog state
  const [isRequisitionDialogOpen, setIsRequisitionDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  /**
   * Inventory
   */
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["supply_items"],
    queryFn: () => apiFetch("/supply/items"),
  });

  useEffect(() => {
    apiFetch("/me")
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  const isAdmin =
    user?.app_role === "admin" ||
    user?.app_role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  /**
   * Handlers
   */
  const handleEdit = (item) => {
    setEditingItem(item);
    setIsInventoryDialogOpen(true);
  };

  const handleViewHistory = (item) => {
    setHistoryItemId(item.id);
  };

  const handleCloseInventoryDialog = () => {
    setIsInventoryDialogOpen(false);
    setEditingItem(null);
  };

  const handleSuccessInventory = () => {
    queryClient.invalidateQueries({ queryKey: ["supply_items"] });
    handleCloseInventoryDialog();
  };

  const handleSuccessRequisition = () => {
    queryClient.invalidateQueries({ queryKey: ["requisitions"] });
    setIsRequisitionDialogOpen(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-2 sm:gap-3 text-[#2d4650] dark:text-slate-100">
              <Package className="w-8 h-8 sm:w-10 sm:h-10" />
              SupplyStop
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              Equipment library and inventory management
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="gap-2 border-[#610345] text-[#610345] hover:bg-pink-50 w-full sm:w-auto"
              onClick={() => setIsRequisitionDialogOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              New Requisition
            </Button>

            {isAdmin && (
              <Button
                className="gap-2 bg-[#610345] hover:bg-[#4a0235] text-white shadow-lg w-full sm:w-auto"
                onClick={() => {
                  setEditingItem(null);
                  setIsInventoryDialogOpen(true);
                }}
              >
                <Plus className="w-5 h-5" />
                Add to Inventory
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="inventory" className="w-full">
          <div className="mb-6 overflow-x-auto">
            <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-1 inline-flex">
              <TabsTrigger value="inventory" className="data-[state=active]:bg-[#610345] data-[state=active]:text-white">
                <Package className="w-4 h-4 mr-2" />
                Inventory Library
              </TabsTrigger>
              <TabsTrigger value="requisitions" className="data-[state=active]:bg-[#610345] data-[state=active]:text-white">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Requisitions
              </TabsTrigger>
              <TabsTrigger value="returns" className="data-[state=active]:bg-[#610345] data-[state=active]:text-white">
                <RotateCcw className="w-4 h-4 mr-2" />
                Returns
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inventory">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <InventoryList
                items={inventory}
                onEdit={handleEdit}
                onViewHistory={handleViewHistory}
                isAdmin={isAdmin}
              />
            )}
          </TabsContent>

          <TabsContent value="requisitions">
            <RequisitionList isAdmin={isAdmin} currentUser={user} />
          </TabsContent>

          <TabsContent value="returns">
            <ReturnsList isAdmin={isAdmin} currentUser={user} />
          </TabsContent>
        </Tabs>

        {/* Admin Tools */}
        {isAdmin && <AdminTools inventory={inventory} />}

        {/* Inventory Dialog */}
        <Dialog open={isInventoryDialogOpen} onOpenChange={(open) => !open && handleCloseInventoryDialog()}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details below to {editingItem ? "update the" : "add a new"} item.
              </DialogDescription>
            </DialogHeader>
            <InventoryForm
              item={editingItem}
              onSuccess={handleSuccessInventory}
              onCancel={handleCloseInventoryDialog}
            />
          </DialogContent>
        </Dialog>

        {/* Requisition Dialog */}
        <Dialog open={isRequisitionDialogOpen} onOpenChange={setIsRequisitionDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Requisition Request</DialogTitle>
              <DialogDescription>
                Select items from the inventory to reserve for your event.
              </DialogDescription>
            </DialogHeader>
            <RequisitionForm
              inventory={inventory}
              onSuccess={handleSuccessRequisition}
              onCancel={() => setIsRequisitionDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={!!historyItemId} onOpenChange={(open) => !open && setHistoryItemId(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Item Usage History</DialogTitle>
              <DialogDescription>
                Previous requisitions for this item.
              </DialogDescription>
            </DialogHeader>
            {historyItemId && <InventoryHistory itemId={historyItemId} />}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
