import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, History, Pencil, QrCode, Search } from "lucide-react";

import { apiFetch } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SupplyItemPhoto({ fileId, name }) {
  const photoQuery = useQuery({
    queryKey: ["supply-item-photo", fileId],
    queryFn: () => apiFetch(`/files/${fileId}/url`),
    enabled: Boolean(fileId),
    staleTime: 4 * 60 * 1000,
  });
  return photoQuery.data?.url
    ? <img src={photoQuery.data.url} alt={`${name} inventory item`} className="mb-3 h-36 w-full rounded-lg object-cover" />
    : null;
}

export default function InventoryList({ items = [], onEdit, onViewHistory, onLabels, onAssets, onKit, isAdmin }) {
  const [query, setQuery] = useState("");
  const [trackingType, setTrackingType] = useState("all");
  const filtered = useMemo(() => items.filter((item) => {
    const matchesType = trackingType === "all" || item.tracking_type === trackingType;
    const haystack = [item.name, item.category, item.storage_location, item.asset_code, item.barcode, ...(item.tags || [])].join(" ").toLowerCase();
    return matchesType && haystack.includes(query.trim().toLowerCase());
  }), [items, query, trackingType]);

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, codes, locations, and tags" /></div>
      <select className="rounded-md border px-3 py-2 text-sm" value={trackingType} onChange={(event) => setTrackingType(event.target.value)}><option value="all">All tracking types</option><option value="quantity">Quantity items</option><option value="serialized">Serialized assets</option><option value="kit">Kits</option><option value="consumable">Consumables</option></select>
    </div>
    {!filtered.length && <p className="rounded-lg border bg-white p-8 text-center text-slate-500">No inventory items match this view.</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
      <SupplyItemPhoto fileId={item.photo_file_id} name={item.name || "Inventory"} />
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{item.name || "Unnamed item"}</h3><div className="mt-1 flex flex-wrap gap-1"><Badge variant="outline" className="capitalize">{item.tracking_type || "quantity"}</Badge>{item.category && <Badge variant="secondary">{item.category}</Badge>}</div></div><div className={`rounded-full px-3 py-1 text-sm font-semibold ${Number(item.quantity_available) === 0 ? "bg-red-50 text-red-700" : Number(item.quantity_available) < 5 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{item.quantity_available ?? 0} available</div></div>
      {item.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.description}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">{item.storage_location && <><dt>Location</dt><dd className="text-right text-slate-700">{item.storage_location}</dd></>}{item.condition && <><dt>Condition</dt><dd className="text-right text-slate-700">{item.condition}</dd></>}{(item.asset_code || item.barcode) && <><dt>Identifier</dt><dd className="truncate text-right text-slate-700">{item.asset_code || item.barcode}</dd></>}</dl>
      {isAdmin && <div className="mt-4 flex flex-wrap gap-1 border-t pt-3"><Button size="sm" variant="ghost" className="gap-1" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button size="sm" variant="ghost" className="gap-1" onClick={() => onViewHistory(item)}><History className="h-3.5 w-3.5" /> History</Button><Button size="sm" variant="ghost" className="gap-1" onClick={() => onLabels(item)}><QrCode className="h-3.5 w-3.5" /> Labels</Button>{item.tracking_type === "serialized" && <Button size="sm" variant="ghost" className="gap-1" onClick={() => onAssets(item)}><Boxes className="h-3.5 w-3.5" /> Assets</Button>}{item.tracking_type === "kit" && <Button size="sm" variant="ghost" className="gap-1" onClick={() => onKit(item)}><Boxes className="h-3.5 w-3.5" /> Components</Button>}</div>}
    </article>)}</div>
  </div>;
}
