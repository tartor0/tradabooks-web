'use client';

import { useState } from 'react';
import type { StoreProfile, StoreProduct } from '@/lib/supabase';
import { buildOrderWhatsAppLink, formatNaira, shortOrderRef } from '@/lib/whatsapp';
import styles from './OrderModal.module.css';

type CustomerIdentity = { name: string; phone: string };

type SubmitState = 'idle' | 'submitting' | 'error';

export function OrderModal({
  store,
  product,
  savedIdentity,
  onClose,
  onOrderPlaced,
}: {
  store: StoreProfile;
  product: StoreProduct;
  savedIdentity: CustomerIdentity | null;
  onClose: () => void;
  onOrderPlaced: (identity: CustomerIdentity) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState(savedIdentity?.name ?? '');
  const [phone, setPhone] = useState(savedIdentity?.phone ?? '');
  const [note, setNote] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maxQty = Math.max(product.quantity, 1);
  const totalKobo = product.price_kobo * quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Enter your name so the trader knows who ordered.');
      return;
    }

    setState('submitting');
    setErrorMessage(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-customer-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          trader_id: store.id,
          product_id: product.id,
          quantity,
          customer_name: name.trim(),
          customer_phone: phone.trim() || null,
          note: note.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Could not place order. Try again.');
      }

      const orderId = data.order_id as string;
      const ref = data.short_ref ?? shortOrderRef(orderId);

      const whatsappNumber = store.whatsapp_number ?? store.phone_number;
      if (!whatsappNumber) {
        throw new Error('This store has no WhatsApp number set up yet.');
      }

      const waLink = buildOrderWhatsAppLink({
        traderWhatsapp: whatsappNumber,
        traderStoreName: store.store_name,
        productName: product.name,
        priceKobo: product.price_kobo,
        quantity,
        customerName: name.trim(),
        note: note.trim() || undefined,
        shortRef: ref,
      });

      onOrderPlaced({ name: name.trim(), phone: phone.trim() });

      // Hand off to WhatsApp — same tab works best in the WhatsApp in-app
      // browser, where pop-up/new-tab behavior is unreliable.
      window.location.href = waLink;
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className={styles.productSummary}>
          <h2 id="order-modal-title" className={styles.productName}>
            {product.name}
          </h2>
          <span className={styles.unitPrice}>{formatNaira(product.price_kobo)} each</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>How many?</label>
            <div className={styles.qtyControl}>
              <button
                type="button"
                className={styles.qtyButton}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button
                type="button"
                className={styles.qtyButton}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="customer-name">
              Your name
            </label>
            <input
              id="customer-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chioma"
              required
              maxLength={100}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="customer-phone">
              Phone number <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="customer-phone"
              className={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="080..."
              maxLength={20}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="customer-note">
              Note to seller <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="customer-note"
              className={styles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. deliver to Lekki"
              maxLength={200}
              rows={2}
            />
          </div>

          <div className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.totalValue}>{formatNaira(totalKobo)}</span>
          </div>

          {errorMessage && <p className={styles.error}>{errorMessage}</p>}

          <button type="submit" className={styles.submitButton} disabled={state === 'submitting'}>
            {state === 'submitting' ? 'Placing order…' : 'Send order on WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
}
