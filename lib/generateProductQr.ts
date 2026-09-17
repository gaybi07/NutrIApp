import QRCode from "qrcode";

/**
 * Genera la imagen (data URL) de un código QR que codifica directamente el
 * nombre del producto -- para pegarlo en el envase e identificarlo después
 * con ProductScanner. A propósito NO es un código de barras de fábrica: así
 * no dependemos de que el producto esté en ninguna base externa, cualquier
 * cosa que tengas en la Alacena se puede "etiquetar" con su propio código.
 */
export function generateProductQrDataUrl(name: string): Promise<string> {
  return QRCode.toDataURL(name, { margin: 1, width: 320 });
}
