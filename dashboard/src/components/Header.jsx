export function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-4)",
        padding: "var(--spacing-6) var(--spacing-8)",
        background: "var(--surface-bright)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
      }}
    >
      <img
        src="/logo-ad-energia.svg"
        alt="AD Energia"
        style={{ height: 40 }}
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--headline-md)",
          fontWeight: 700,
          color: "var(--primary)",
        }}
      >
        Solar Health Monitor
      </h1>
    </header>
  );
}
