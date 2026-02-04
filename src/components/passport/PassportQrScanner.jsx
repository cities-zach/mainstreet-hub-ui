import React, { useEffect, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

export default function PassportQrScanner({ isOpen, onClose, onScan }) {
  const containerId = useMemo(
    () => `passport-qr-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const qr = new Html5Qrcode(containerId);
    let active = true;

    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        if (!active) return;
        onScan(decodedText);
      },
      () => {}
    ).catch(() => {});

    return () => {
      active = false;
      qr.stop().then(() => qr.clear()).catch(() => {});
    };
  }, [containerId, isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div id={containerId} className="w-full min-h-[320px]" />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close scanner
        </Button>
      </div>
    </div>
  );
}
