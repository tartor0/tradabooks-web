export default function StoreNotFound() {
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
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            marginBottom: '8px',
          }}
        >
          We can&rsquo;t find this store
        </h1>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '15px' }}>
          Check the link and try again, or ask the trader to resend it.
        </p>
      </div>
    </main>
  );
}
