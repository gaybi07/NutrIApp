"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Escanea un código QR con la cámara del dispositivo y devuelve el texto
 * decodificado -- pensado para códigos QUE GENERAMOS NOSOTROS MISMOS por
 * producto (ver lib/generateProductQr.ts), no para leer códigos de barra de
 * fábrica: el texto es directamente el nombre del producto tal cual se
 * escribió al generarlo, así reusa la misma normalización (inventoryKey)
 * que ya usa el resto de la app para reconocer "el mismo" producto.
 *
 * Se detiene sola apenas lee un código (no sigue escaneando en loop) y
 * libera la cámara al cerrarse.
 */
export function ProductScanner({ onDecode, onClose }: { onDecode: (text: string) => void; onClose: () => void }) {
  const rawId = useId();
  const containerId = `product-scanner-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let scannerInstance: import("html5-qrcode").Html5Qrcode | null = null;

    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId);
        scannerInstance = scanner;
        return scanner
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 240 },
            (decodedText) => {
              if (handledRef.current) return;
              handledRef.current = true;
              scanner
                .stop()
                .catch(() => {})
                .finally(() => onDecode(decodedText));
            },
            () => {
              // Fallo de decodificación de un frame individual -- normal
              // mientras se busca el código, no es un error real.
            }
          )
          .then(() => {
            if (!cancelled) setStarting(false);
          });
      })
      .catch(() => {
        if (!cancelled) setError("No pude acceder a la cámara. Revisá que le hayas dado permiso al navegador.");
      });

    return () => {
      cancelled = true;
      if (scannerInstance) {
        scannerInstance
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scannerInstance?.clear();
            } catch {
              // no-op
            }
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/90 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="font-display text-lg text-text">Escanear código</div>
          <button type="button" onClick={onClose} className="font-mono text-[11px] text-textMuted">
            Cerrar
          </button>
        </div>
        <div className="mb-2 rounded-lg border border-dashed border-border bg-bg/40 p-2 text-[11px] text-textMuted">
          Esto lee los códigos QR que generás vos mismo desde un producto (botón &quot;Generar código QR&quot;, en la ficha del producto) — no
          códigos de barra de fábrica. Sirve para consumir rápido algo que ya imprimiste y pegaste en el envase.
        </div>
        {error ? (
          <div className="rounded-xl border border-dashed border-rust/40 bg-rust/10 p-3 text-[12px] text-rust">{error}</div>
        ) : (
          <>
            <div id={containerId} className="overflow-hidden rounded-xl border border-border bg-bg" />
            <div className="mt-2 text-center text-[11px] text-textMuted">
              {starting ? "Iniciando cámara..." : "Apuntá al código QR del producto."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
