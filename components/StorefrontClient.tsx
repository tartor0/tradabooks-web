'use client';

import { useEffect, useState } from 'react';
import type { StoreProfile, StoreProduct } from '@/lib/supabase';
import { formatNaira } from '@/lib/whatsapp';
import { OrderModal } from '@/components/OrderModal';
import styles from './Storefront.module.css';

const RETURNING_CUSTOMER_KEY = 'tb_customer_identity';

type CustomerIdentity = {
  name: string;
  phone: string;
};

function loadSavedIdentity(slug: string): CustomerIdentity | null {
  try {
    const raw = sessionStorage.getItem(`${RETURNING_CUSTOMER_KEY}:${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerIdentity;
  } catch {
    return null;
  }
}

function saveIdentity(slug: string, identity: CustomerIdentity) {
  try {
    sessionStorage.setItem(`${RETURNING_CUSTOMER_KEY}:${slug}`, JSON.stringify(identity));
  } catch {
    // sessionStorage unavailable (private browsing etc) — non-critical, just skip persistence
  }
}

export function StorefrontClient({
  store,
  products,
}: {
  store: StoreProfile;
  products: StoreProduct[];
}) {
  const [activeProduct, setActiveProduct] = useState<StoreProduct | null>(null);
  const [savedIdentity, setSavedIdentity] = useState<CustomerIdentity | null>(null);

  useEffect(() => {
    setSavedIdentity(loadSavedIdentity(store.store_slug));
  }, [store.store_slug]);

  const initials = store.store_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>
          {store.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.profile_image_url} alt="" className={styles.avatarImg} />
          ) : (
            <span>{initials || 'TB'}</span>
          )}
        </div>
        <h1 className={styles.storeName}>{store.store_name}</h1>
        {/* {store.category && <span className={styles.category}>{store.category}</span>}
        {store.bio && <p className={styles.bio}>{store.bio}</p>} */}

        {savedIdentity && (
          <p className={styles.welcomeBack}>Welcome back, {savedIdentity.name.split(' ')[0]} 👋</p>
        )}

        <div className={styles.poweredBy}>Powered by TradaBooks</div>
      </header>

      <section className={styles.products}>
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No products listed yet. Check back soon.</p>
          </div>
        ) : (
          products.map((product) => {
            const outOfStock = product.quantity <= 0;
            const lowStock = !outOfStock && product.quantity <= 3;

            return (
              <article key={product.id} className={styles.card}>
                <div className={styles.cardImage}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} loading="lazy" />
                  ) : (
                    <div className={styles.cardImagePlaceholder} aria-hidden="true" />
                  )}
                </div>

                <div className={styles.cardBody}>
                  {product.category && <span className={styles.cardCategory}>{product.category}</span>}
                  <h2 className={styles.cardName}>{product.name}</h2>
                  <div className={styles.cardPriceRow}>
                    <span className={styles.cardPrice}>{formatNaira(product.price_kobo)}</span>
                    <span
                      className={
                        outOfStock
                          ? styles.badgeOut
                          : lowStock
                          ? styles.badgeLow
                          : styles.badgeIn
                      }
                    >
                      {outOfStock ? 'Out of stock' : lowStock ? `Only ${product.quantity} left` : 'In stock'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.orderButton}
                    disabled={outOfStock}
                    onClick={() => setActiveProduct(product)}
                  >
                    {outOfStock ? 'Out of stock' : 'Order on WhatsApp'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {activeProduct && (
        <OrderModal
          store={store}
          product={activeProduct}
          savedIdentity={savedIdentity}
          onClose={() => setActiveProduct(null)}
          onOrderPlaced={(identity) => {
            saveIdentity(store.store_slug, identity);
            setSavedIdentity(identity);
          }}
        />
      )}
    </main>
  );
}
