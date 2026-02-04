import React, { useEffect, useMemo, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

export default function PassportQrScanner({ isOpen, onClose, onScan }) {
  const containerId = useMemo(
    () => `passport-qr-${Math.random().toString(36).slice(2, 8)}`,
    []
  );
  const qrRef = useRef(null);
  const runningRef = useRef(false);
  const scanningRef = useRef(false);

  useEffect(() => {
    if (!qrRef.current) {
      qrRef.current = new Html5Qrcode(containerId);
    }
    const qr = qrRef.current;
    let active = true;

    const start = async () => {
      try {
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (!active) return;
            if (scanningRef.current) return;
            scanningRef.current = true;
            onScan(decodedText);
            setTimeout(() => {
              scanningRef.current = false;
            }, 1500);
          },
          () => {}
        );
        runningRef.current = true;
      } catch {
        runningRef.current = false;
      }
    };

    const stop = async () => {
      try {
        await qr.stop();
      } catch {
        // Ignore stop errors if not running.
      } finally {
        runningRef.current = false;
      }
    };

    if (isOpen && !runningRef.current) {
      start();
    }
    if (!isOpen && runningRef.current) {
      stop();
    }

    return () => {
      active = false;
      if (runningRef.current) {
        qr.stop().catch(() => {});
        runningRef.current = false;
      }
    };
  }, [containerId, isOpen, onScan]);

  return (
    <div className={`space-y-3 ${isOpen ? "" : "hidden"}`}>
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
