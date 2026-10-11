/** Shown before providers and routes when the runtime cannot use Supabase. */
export function ConfigurationUnavailable() {
  return (
    <main
      aria-labelledby="configuration-unavailable-title"
      style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: 24 }}
    >
      <section style={{ maxWidth: 560 }}>
        <p className="eyebrow">Panel no disponible</p>
        <h1 id="configuration-unavailable-title">Falta configurar la conexión del panel</h1>
        <p className="muted">
          Este entorno no puede mostrar información operativa hasta contar con una URL y una clave pública válidas de Supabase.
        </p>
        <p className="muted">
          Configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, luego vuelve a desplegar la aplicación.
        </p>
      </section>
    </main>
  );
}
