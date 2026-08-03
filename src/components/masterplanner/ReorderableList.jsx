import React, { useState } from "react";
import { GripVertical } from "lucide-react";

export default function ReorderableList({
  items,
  onReorder,
  renderItem,
  disabled = false,
  className = "space-y-3",
}) {
  const [dragIndex, setDragIndex] = useState(null);

  const moveItem = (fromIndex, toIndex) => {
    if (
      disabled ||
      fromIndex === null ||
      fromIndex === toIndex ||
      toIndex < 0 ||
      toIndex >= items.length
    ) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next);
  };

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={item?._row_id || item?.id || index}
          className="relative"
          draggable={!disabled}
          onDragStart={(event) => {
            setDragIndex(index);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
          }}
          onDragOver={(event) => {
            if (!disabled) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const from = Number(event.dataTransfer.getData("text/plain"));
            moveItem(Number.isInteger(from) ? from : dragIndex, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
        >
          {!disabled && (
            <button
              type="button"
              className="absolute -left-3 top-3 z-10 cursor-grab rounded-md border bg-white p-1 text-slate-400 shadow-sm hover:text-slate-700 active:cursor-grabbing"
              aria-label={`Drag row ${index + 1} to reorder`}
              title="Drag to reorder; use arrow keys to move"
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveItem(index, index - 1);
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveItem(index, index + 1);
                }
              }}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
