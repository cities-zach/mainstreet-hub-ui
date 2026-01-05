import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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

  const parseIntSafe = (val, fallback = 1) => {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const parseFloatSafe = (val, fallback = 0) => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  };

  /* ---------- MSO INVENTORY ---------- */

  const addMsoItem = () => {
    onChange({
      mso_inventory_needs: [
        ...msoNeeds,
        {
          supply_item_id: "",
          supply_item_name: "",
          quantity: 1,
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
        { item: "", quantity: 1, source: "", cost: 0, notes: "" },
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
            <Button
              onClick={addMsoItem}
              variant="outline"
              size="sm"
              className="gap-2 text-[#610345] border-[#610345]"
            >
              <Plus className="w-4 h-4" /> Add Inventory Item
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {msoNeeds.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 items-start bg-pink-50/30 p-4 rounded-lg border border-pink-100"
            >
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
                        {typeof inv.quantity_on_hand === "number"
                          ? ` • Available: ${inv.quantity_on_hand}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs mb-1 block">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateMsoItem(
                      index,
                      "quantity",
                      parseIntSafe(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs mb-1 block">Pickup Date</Label>
                <Input
                  type="date"
                  value={item.pickup_date || ""}
                  onChange={(e) =>
                    updateMsoItem(index, "pickup_date", e.target.value)
                  }
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs mb-1 block">Return Date</Label>
                <Input
                  type="date"
                  value={item.return_date || ""}
                  onChange={(e) =>
                    updateMsoItem(index, "return_date", e.target.value)
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
          ))}

          {msoNeeds.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-sm italic">
              No MSO inventory items added.
            </div>
          )}
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
            <Button onClick={addOtherItem} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add Other Item
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {equipmentNeeds.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 items-start bg-slate-50 p-3 rounded-lg"
            >
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
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateOtherItem(
                      index,
                      "quantity",
                      parseIntSafe(e.target.value)
                    )
                  }
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
                  type="number"
                  min="0"
                  value={item.cost}
                  onChange={(e) =>
                    updateOtherItem(
                      index,
                      "cost",
                      parseFloatSafe(e.target.value)
                    )
                  }
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
          ))}

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
