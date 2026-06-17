export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--color-brand-deep)',
            marginBottom: '8px',
          }}
        >
          TradaBooks
        </h1>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '15px' }}>
          You&rsquo;ll need a store link to view a shop &mdash; ask your trader for theirs.
        </p>
      </div>
    </main>
  );
}
