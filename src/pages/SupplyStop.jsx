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
  QrCode,
  Printer,
} from "lucide-react";

import InventoryForm from "@/components/supplystop/InventoryForm";
import InventoryList from "@/components/supplystop/InventoryList";
import RequisitionForm from "@/components/supplystop/RequisitionForm";
import RequisitionList from "@/components/supplystop/RequisitionList";
import InventoryHistory from "@/components/supplystop/InventoryHistory";
import ReturnsList from "@/components/supplystop/ReturnsList";
import AdminTools from "@/components/supplystop/AdminTools";
import { apiFetch } from "@/api";
import { toast } from "sonner";
import PassportQrScanner from "@/components/passport/PassportQrScanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";

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
  const [activeTab, setActiveTab] = useState("inventory");
  const [requisitionSeedItemId, setRequisitionSeedItemId] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [labelItem, setLabelItem] = useState(null);
  const [labels, setLabels] = useState([]);
  const [assetItem, setAssetItem] = useState(null);
  const [assetForm, setAssetForm] = useState({ asset_code: "", serial_number: "", barcode: "" });
  const [kitItem, setKitItem] = useState(null);
  const [kitComponents, setKitComponents] = useState({});

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

  const resolveScan = async (raw) => {
    let code = String(raw || "").trim();
    try { const url = new URL(code, window.location.origin); code = url.searchParams.get("scan") || (url.origin !== window.location.origin ? code : url.pathname.split("/").filter(Boolean).at(-1)) || code; } catch { /* Manual and opaque identifiers are expected. */ }
    if (!code) return;
    try { const result = await apiFetch(`/supply/scan/${encodeURIComponent(code)}`); setScanResult(result); setScanOpen(false); toast.success(`Found ${result.name}`); }
    catch (error) { toast.error(error.message || "No inventory item matched that code"); }
  };

  const loadLabels = async (item) => {
    try { setLabelItem(item); setLabels(await apiFetch(`/supply/items/${item.id}/labels`)); }
    catch (error) { setLabelItem(null); toast.error(error.message || "Labels could not be loaded"); }
  };

  const createAsset = async () => {
    try { await apiFetch(`/supply/items/${assetItem.id}/assets`, { method: "POST", body: JSON.stringify(assetForm) }); setAssetForm({ asset_code: "", serial_number: "", barcode: "" }); queryClient.invalidateQueries({ queryKey: ["supply-assets", assetItem.id] }); toast.success("Serialized asset created"); }
    catch (error) { toast.error(error.message || "Asset could not be created"); }
  };

  const openKit = async (item) => {
    try { const components = await apiFetch(`/supply/items/${item.id}/components`); setKitComponents(Object.fromEntries(components.map((component) => [component.component_item_id, component.quantity]))); setKitItem(item); }
    catch (error) { toast.error(error.message || "Kit components could not be loaded"); }
  };

  const saveKit = async () => {
    try { await apiFetch(`/supply/items/${kitItem.id}/components`, { method: "PUT", body: JSON.stringify({ components: Object.entries(kitComponents).filter(([, quantity]) => Number(quantity) > 0).map(([supply_item_id, quantity]) => ({ supply_item_id, quantity: Number(quantity) })) }) }); setKitItem(null); toast.success("Kit components updated"); }
    catch (error) { toast.error(error.message || "Kit components could not be saved"); }
  };

  const assetsQuery = useQuery({ queryKey: ["supply-assets", assetItem?.id], queryFn: () => apiFetch(`/supply/items/${assetItem.id}/assets`), enabled: Boolean(assetItem?.id) });

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
              onClick={() => { setRequisitionSeedItemId(null); setIsRequisitionDialogOpen(true); }}
            >
              <ShoppingCart className="w-5 h-5" />
              New Requisition
            </Button>

            <Button variant="outline" className="gap-2" onClick={() => setScanOpen(true)}><QrCode className="h-5 w-5" /> Scan inventory</Button>

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                onLabels={loadLabels}
                onAssets={setAssetItem}
                onKit={openKit}
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
              key={requisitionSeedItemId || "blank-requisition"}
              inventory={inventory}
              initialItemId={requisitionSeedItemId}
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

      <Dialog open={scanOpen} onOpenChange={setScanOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Scan inventory</DialogTitle><DialogDescription>Scan a MainSuite QR label or enter any saved asset, UPC, EAN, serial, or manual code.</DialogDescription></DialogHeader><PassportQrScanner isOpen={scanOpen} onClose={() => setScanOpen(false)} onScan={resolveScan} /><div className="flex gap-2"><Input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Enter code manually" /><Button onClick={() => resolveScan(manualCode)}>Find</Button></div></DialogContent></Dialog>

      <Dialog open={Boolean(scanResult)} onOpenChange={(open) => !open && setScanResult(null)}><DialogContent><DialogHeader><DialogTitle>{scanResult?.name}</DialogTitle><DialogDescription>Inventory scan result</DialogDescription></DialogHeader>{scanResult && <div className="space-y-4 text-sm"><div className="space-y-2"><p><strong>Tracking:</strong> {scanResult.tracking_type}</p><p><strong>Available:</strong> {scanResult.quantity_available}</p><p><strong>Location:</strong> {scanResult.storage_location || "Not assigned"}</p><p><strong>Condition:</strong> {scanResult.condition || "Not assigned"}</p>{scanResult.scanned_asset_code && <p><strong>Asset:</strong> {scanResult.scanned_asset_code} ({scanResult.scanned_asset_status})</p>}</div><div className="flex flex-wrap gap-2 border-t pt-3"><Button size="sm" onClick={() => { setRequisitionSeedItemId(scanResult.id); setIsRequisitionDialogOpen(true); setScanResult(null); }}>Reserve / requisition</Button><Button size="sm" variant="outline" onClick={() => { setActiveTab("returns"); setScanResult(null); }}>Receive return</Button><Button size="sm" variant="outline" onClick={() => { setHistoryItemId(scanResult.id); setScanResult(null); }}>View history</Button><Button size="sm" variant="outline" onClick={() => { loadLabels(scanResult); setScanResult(null); }}>Print labels</Button>{isAdmin && <Button size="sm" variant="outline" onClick={() => { setEditingItem(inventory.find((item) => item.id === scanResult.id) || scanResult); setIsInventoryDialogOpen(true); setScanResult(null); }}>Move / update condition</Button>}</div></div>}</DialogContent></Dialog>

      <Dialog open={Boolean(labelItem)} onOpenChange={(open) => !open && setLabelItem(null)}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Printable labels: {labelItem?.name}</DialogTitle><DialogDescription>Print these labels and place them on the physical asset or storage bin. The short code remains a manual fallback.</DialogDescription></DialogHeader><div id="supply-label-sheet" className="grid gap-3 sm:grid-cols-2">{labels.map((label) => <div key={label.id} className="supply-print-label rounded-lg border-2 border-black p-4 text-center"><p className="font-bold">{label.item_name}</p><QRCodeSVG className="mx-auto mt-3" size={150} value={`${window.location.origin}${label.scan_path}`} level="M" /><p className="mt-3 font-mono text-xl tracking-wider">{label.scan_value}</p><p className="mt-2 break-all text-[10px]">{window.location.origin}{label.scan_path}</p></div>)}</div><Button className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print label sheet</Button></DialogContent></Dialog>

      <Dialog open={Boolean(assetItem)} onOpenChange={(open) => !open && setAssetItem(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Serialized assets: {assetItem?.name}</DialogTitle><DialogDescription>Each physical unit receives its own identifier and lifecycle history.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-3"><div><Label htmlFor="asset-code">Asset code *</Label><Input id="asset-code" value={assetForm.asset_code} onChange={(event) => setAssetForm({ ...assetForm, asset_code: event.target.value })} /></div><div><Label htmlFor="serial-number">Serial number</Label><Input id="serial-number" value={assetForm.serial_number} onChange={(event) => setAssetForm({ ...assetForm, serial_number: event.target.value })} /></div><div><Label htmlFor="asset-barcode">Existing barcode</Label><Input id="asset-barcode" value={assetForm.barcode} onChange={(event) => setAssetForm({ ...assetForm, barcode: event.target.value })} /></div></div><Button disabled={!assetForm.asset_code.trim()} onClick={createAsset}>Add asset</Button><div className="max-h-60 space-y-2 overflow-y-auto">{(assetsQuery.data || []).map((asset) => <div key={asset.id} className="flex justify-between rounded-md border p-3 text-sm"><span><strong>{asset.asset_code}</strong>{asset.serial_number ? ` · ${asset.serial_number}` : ""}</span><span className="capitalize text-slate-500">{asset.status}</span></div>)}</div></DialogContent></Dialog>

      <Dialog open={Boolean(kitItem)} onOpenChange={(open) => !open && setKitItem(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Kit components: {kitItem?.name}</DialogTitle><DialogDescription>Define the inventory quantities contained in one complete kit.</DialogDescription></DialogHeader><div className="max-h-80 space-y-2 overflow-y-auto">{inventory.filter((item) => item.id !== kitItem?.id && item.tracking_type !== "kit").map((item) => <div key={item.id} className="flex items-center gap-3 rounded-md border p-2"><span className="flex-1 text-sm">{item.name}</span><Input aria-label={`${item.name} quantity in kit`} className="w-24" type="number" min="0" value={kitComponents[item.id] || ""} onChange={(event) => setKitComponents((current) => ({ ...current, [item.id]: event.target.value }))} /></div>)}</div><Button onClick={saveKit}>Save components</Button></DialogContent></Dialog>
    </div>
  );
}
