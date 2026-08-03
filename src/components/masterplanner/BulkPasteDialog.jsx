import React, { useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function splitRow(line) {
  if (line.includes("\t")) return line.split("\t");
  return line.split(",").map((cell) => cell.trim());
}

function parsePastedRows(text, columns) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = splitRow(line);
      const row = {
        _row_id: globalThis.crypto.randomUUID(),
      };
      columns.forEach((column, index) => {
        const raw = cells[index]?.trim() ?? "";
        row[column.key] = column.parse
          ? column.parse(raw)
          : raw || column.defaultValue || "";
      });
      return row;
    });
}

export default function BulkPasteDialog({
  title,
  columns,
  onImport,
  buttonLabel = "Paste rows",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const parsed = useMemo(() => parsePastedRows(text, columns), [columns, text]);

  const importRows = () => {
    if (!parsed.length) return;
    onImport(parsed);
    setText("");
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <ClipboardPaste className="w-4 h-4" />
        {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Paste spreadsheet rows in this column order:
            </p>
            <div className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
              {columns.map((column) => column.label).join("  •  ")}
            </div>
            <Textarea
              value={text}
              onChange={(event) => setText(event.currentTarget.value)}
              placeholder={columns.map((column) => column.label).join("\t")}
              rows={10}
              autoFocus
            />
            <p className="text-xs text-slate-500">
              Tab-separated spreadsheet data works best. Comma-separated rows
              are also supported.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={importRows} disabled={!parsed.length}>
              Add {parsed.length || 0} rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
