import React from "react";
import { Input } from "@/components/ui/input";
import TemporalInput from "@/components/masterplanner/TemporalInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import BulkPasteDialog from "@/components/masterplanner/BulkPasteDialog";
import ReorderableList from "@/components/masterplanner/ReorderableList";

const INVENTORY_COLUMNS = [
  { key: "supply_item_name", label: "Inventory item name" },
  { key: "quantity", label: "Quantity or TBD" },
  { key: "pickup_date", label: "Pickup date" },
  { key: "return_date", label: "Return date" },
  { key: "notes", label: "Notes" },
];

const EQUIPMENT_COLUMNS = [
  { key: "item", label: "Item" },
  { key: "quantity", label: "Quantity or TBD" },
  { key: "source", label: "Source" },
  { key: "cost", label: "Estimated cost or TBD" },
  { key: "notes", label: "Notes" },
];

export default function MaterialsSection({
  data,
  onChange,
  readOnly,
  inventoryItems = [],
}) {
  const equipmentNeeds = data.equipment_needs || [];
  const msoNeeds = data.mso_inventory_needs || [];

  const availableInventory = inventoryItems.filter(
    (i) => i.status !== "retired"
  );

  const preserveTbdNumber = (value) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    if (normalized.toUpperCase() === "TBD") return "TBD";
    const number = Number(normalized);
    return Number.isFinite(number) ? number : normalized;
  };

  /* ---------- MSO INVENTORY ---------- */

  const addMsoItem = () => {
    onChange({
      mso_inventory_needs: [
        ...msoNeeds,
        {
          _row_id: globalThis.crypto.randomUUID(),
          supply_item_id: "",
          supply_item_name: "",
          quantity: "TBD",
          pickup_date: "",
          return_date: "",
          notes: "",
        },
      ],
    });
  };

  const updateMsoItem = (index, field, value) => {
    const updated = [...msoNeeds];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ mso_inventory_needs: updated });
  };

  const removeMsoItem = (index) => {
    onChange({
      mso_inventory_needs: msoNeeds.filter((_, i) => i !== index),
    });
  };

  /* ---------- OTHER EQUIPMENT ---------- */

  const addOtherItem = () => {
    onChange({
      equipment_needs: [
        ...equipmentNeeds,
        {
          _row_id: globalThis.crypto.randomUUID(),
          item: "",
          quantity: "TBD",
          source: "",
          cost: "TBD",
          notes: "",
        },
      ],
    });
  };

  const updateOtherItem = (index, field, value) => {
    const updated = [...equipmentNeeds];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ equipment_needs: updated });
  };

  const removeOtherItem = (index) => {
    onChange({
      equipment_needs: equipmentNeeds.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* MSO INVENTORY NEEDS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <Label className="text-lg font-semibold text-[#610345]">
              MSO Inventory Needs
            </Label>
            <p className="text-sm text-slate-500">
              Request items from MSO inventory
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <BulkPasteDialog
                title="Paste inventory needs"
                columns={INVENTORY_COLUMNS}
                disabled={!availableInventory.length}
                onImport={(rows) =>
                  onChange({
                    mso_inventory_needs: [
                      ...msoNeeds,
                      ...rows.map((row) => {
                        const matched = availableInventory.find(
                          (item) =>
                            item.name?.toLowerCase() ===
                            row.supply_item_name?.toLowerCase()
                        );
                        return {
                          ...row,
                          supply_item_id: matched?.id || "",
                        };
                      }),
                    ],
                  })
                }
              />
              <Button
                onClick={addMsoItem}
                variant="outline"
                size="sm"
                className="gap-2 text-[#610345] border-[#610345]"
                disabled={!availableInventory.length}
              >
                <Plus className="w-4 h-4" /> Add Inventory Item
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <ReorderableList
            items={msoNeeds}
            disabled={readOnly}
            onReorder={(items) => onChange({ mso_inventory_needs: items })}
            renderItem={(item, index) => (
              <div className="grid grid-cols-12 gap-3 items-start bg-pink-50/30 p-4 pl-6 rounded-lg border border-pink-100">
              <div className="col-span-12 md:col-span-6">
                <Label className="text-xs mb-1 block">Item</Label>
                {readOnly ? (
                  <Input value={item.supply_item_name} disabled />
                ) : (
                  <select
                    value={item.supply_item_id || ""}
                    onChange={(e) => {
                      const selected = availableInventory.find(
                        (i) => i.id === e.target.value
                      );
                      if (selected) {
                        updateMsoItem(index, "supply_item_id", selected.id);
                        updateMsoItem(index, "supply_item_name", selected.name);
                      }
                    }}
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-md"
                  >
                    <option value="">Select item…</option>
                    {availableInventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                        {inv.sku ? ` (SKU: ${inv.sku})` : ""}
                        {typeof inv.quantity_available === "number"
                          ? ` • Available: ${inv.quantity_available}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs mb-1 block">Quantity</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={item.quantity ?? ""}
                  onChange={(e) =>
                    updateMsoItem(
                      index,
                      "quantity",
                      preserveTbdNumber(e.target.value)
                    )
                  }
                  placeholder="Qty or TBD"
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs mb-1 block">Pickup Date</Label>
                <TemporalInput
                  type="date"
                  value={item.pickup_date || ""}
                  onValueChange={(value) =>
                    updateMsoItem(index, "pickup_date", value)
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs mb-1 block">Return Date</Label>
                <TemporalInput
                  type="date"
                  value={item.return_date || ""}
                  onValueChange={(value) =>
                    updateMsoItem(index, "return_date", value)
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-11">
                <Label className="text-xs mb-1 block">Notes</Label>
                <Input
                  value={item.notes}
                  onChange={(e) =>
                    updateMsoItem(index, "notes", e.target.value)
                  }
                  disabled={readOnly}
                />
              </div>

              {!readOnly && (
                <div className="col-span-1 pt-6 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMsoItem(index)}
                    className="text-slate-400 hover:text-red-500"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              </div>
            )}
          />

          {availableInventory.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-5 text-center text-sm text-amber-900">
              No inventory items configured. Add them in{" "}
              <a href="/supplystop" className="font-semibold underline">
                SupplyStop
              </a>{" "}
              before selecting inventory for this plan.
            </div>
          ) : msoNeeds.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm italic">
              No MSO inventory items added.
            </div>
          ) : null}
        </div>
      </div>

      {/* OTHER EQUIPMENT */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <Label className="text-lg font-semibold text-[#2d4650]">
              Other Equipment & Material Needs
            </Label>
            <p className="text-sm text-slate-500">
              Rentals, purchases, or external sources
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <BulkPasteDialog
                title="Paste equipment and material needs"
                columns={EQUIPMENT_COLUMNS}
                onImport={(rows) =>
                  onChange({ equipment_needs: [...equipmentNeeds, ...rows] })
                }
              />
              <Button onClick={addOtherItem} variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Other Item
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <ReorderableList
            items={equipmentNeeds}
            disabled={readOnly}
            onReorder={(items) => onChange({ equipment_needs: items })}
            renderItem={(item, index) => (
              <div className="grid grid-cols-12 gap-3 items-start bg-slate-50 p-3 pl-6 rounded-lg">
              <div className="col-span-3">
                <Label className="text-xs mb-1 block">Item Name</Label>
                <Input
                  value={item.item}
                  onChange={(e) =>
                    updateOtherItem(index, "item", e.target.value)
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Qty</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={item.quantity ?? ""}
                  onChange={(e) =>
                    updateOtherItem(
                      index,
                      "quantity",
                      preserveTbdNumber(e.target.value)
                    )
                  }
                  placeholder="Qty or TBD"
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Source</Label>
                <Input
                  value={item.source}
                  onChange={(e) =>
                    updateOtherItem(index, "source", e.target.value)
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Est. Cost</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={item.cost ?? ""}
                  onChange={(e) =>
                    updateOtherItem(
                      index,
                      "cost",
                      preserveTbdNumber(e.target.value)
                    )
                  }
                  placeholder="Cost or TBD"
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Notes</Label>
                <Input
                  value={item.notes}
                  onChange={(e) =>
                    updateOtherItem(index, "notes", e.target.value)
                  }
                  disabled={readOnly}
                />
              </div>

              {!readOnly && (
                <div className="col-span-1 pt-6 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOtherItem(index)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              </div>
            )}
          />

          {equipmentNeeds.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-sm italic">
              No other equipment needs listed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
