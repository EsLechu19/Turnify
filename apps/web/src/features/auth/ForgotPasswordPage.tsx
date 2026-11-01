import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/common';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/state/AuthContext';
import { PasswordRecoveryShell } from './PasswordRecoveryShell';

const genericConfirmation = 'Si existe una cuenta asociada, recibirás instrucciones para restablecer tu contraseña.';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || pending) return;
    setPending(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setPending(false);
    if (result.ok) setRequested(true);
    else setError(result.message);
  }

  return (
    <PasswordRecoveryShell
      subtitle="Te enviaremos instrucciones para crear una nueva contraseña."
      title="Recuperar contraseña"
    >
      <form aria-busy={pending} className="login-page__form" onSubmit={handleSubmit}>
        <label className="login-page__field">
          <span>Correo electrónico</span>
          <input
            autoComplete="email"
            autoFocus
            disabled={pending || requested}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@barberia.com"
            required
            type="email"
            value={email}
          />
        </label>
        <div aria-atomic="true" aria-live="polite" className="login-page__alerts">
          {requested ? <p className="login-page__message login-page__message--success" role="status">{genericConfirmation}</p> : null}
          {error ? <p className="login-page__message login-page__message--error" role="alert">{error}</p> : null}
        </div>
        {!isSupabaseConfigured() ? (
          <p className="login-page__configuration" role="status">La conexión con el servidor no está disponible. Configura Supabase para continuar.</p>
        ) : null}
        {!requested ? (
          <Button disabled={!email.trim() || pending || !isSupabaseConfigured()} size="lg" type="submit">
            {pending ? <><span aria-hidden="true" className="login-page__spinner" />Enviando instrucciones…</> : 'Enviar instrucciones'}
          </Button>
        ) : null}
      </form>
      <footer className="login-page__footer"><Link to="/login">Volver al inicio de sesión</Link></footer>
    </PasswordRecoveryShell>
  );
}
