/**
 * Formats kobo (smallest currency unit) as a Naira display string.
 * Matches the Flutter app's formatting: ₦2,500 not ₦2500.00
 */
export function formatNaira(priceKobo: number): string {
  const naira = priceKobo / 100;
  return `₦${naira.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

/**
 * Builds the WhatsApp deep link sent after an order is created.
 * Mirrors StoreService.getProductOrderLink in the Flutter app, extended
 * with quantity, customer name, note, and an order reference so the
 * trader's app-side order record can be matched to the WhatsApp chat.
 */
export function buildOrderWhatsAppLink(params: {
  traderWhatsapp: string;
  traderStoreName: string;
  productName: string;
  priceKobo: number;
  quantity: number;
  customerName: string;
  note?: string;
  shortRef: string;
}): string {
  const { traderWhatsapp, traderStoreName, productName, priceKobo, quantity, customerName, note, shortRef } = params;

  const phone = traderWhatsapp.replace(/\+/g, '');
  const totalKobo = priceKobo * quantity;
  const lineTotal = formatNaira(totalKobo);
  const unitPrice = formatNaira(priceKobo);

  const lines = [
    `Hi ${traderStoreName}! I'd like to order:`,
    '',
    `${quantity}x ${productName} (${unitPrice} each) — ${lineTotal}`,
    '',
    `My name: ${customerName}`,
  ];

  if (note && note.trim().length > 0) {
    lines.push(`Note: ${note.trim()}`);
  }

  lines.push('', `Order ref: #${shortRef}`, '(Sent via TradaBooks)');

  const message = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phone}?text=${message}`;
}

/**
 * Shortens a UUID order ID into a human-scannable reference.
 * Last 8 chars, uppercased — e.g. "a1b2c3d4-...-9f8e7d6c" -> "9F8E7D6C"
 */
export function shortOrderRef(orderId: string): string {
  return orderId.replace(/-/g, '').slice(-8).toUpperCase();
}
