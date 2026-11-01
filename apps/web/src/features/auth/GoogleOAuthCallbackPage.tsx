import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/state/AuthContext';

export function GoogleOAuthCallbackPage() {
  const { status, session } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      if (session.user.role === 'admin') navigate('/', { replace: true });
      else navigate('/login', { replace: true, state: { message: 'Acceso solo para administradores.' } });
    } else if (status === 'anonymous') {
      setFailed(true);
    }
  }, [navigate, session, status]);

  return (
    <main aria-busy={!failed} className="google-callback">
      {failed ? (
        <section aria-labelledby="google-callback-title" className="google-callback__panel">
          <h1 id="google-callback-title">No pudimos iniciar sesión con Google</h1>
          <p>Verifica la configuración del proveedor o intenta nuevamente.</p>
          <Link to="/login">Volver al inicio de sesión</Link>
        </section>
      ) : (
        <p aria-live="polite" role="status">Verificando tu cuenta…</p>
      )}
    </main>
  );
}
