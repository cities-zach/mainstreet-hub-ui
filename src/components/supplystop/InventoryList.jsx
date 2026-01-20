export default function InventoryList({ items = [], onEdit, onViewHistory, isAdmin }) {
  if (!items.length) {
    return <p className="text-slate-500">No inventory items yet.</p>;
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <div
          key={item.id}
          className="p-4 bg-white rounded-lg border"
        >
          <h3 className="font-semibold">{item.name || "Unnamed Item"}</h3>
          {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
          <p className="text-xs text-slate-500">Qty: {item.quantity_available ?? 0}</p>
          {isAdmin && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => onEdit(item)}>Edit</button>
              <button onClick={() => onViewHistory(item)}>History</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
