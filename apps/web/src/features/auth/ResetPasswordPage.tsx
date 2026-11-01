import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/common';
import { useAuth } from '@/state/AuthContext';
import { PasswordRecoveryShell } from './PasswordRecoveryShell';
import { validateNewPassword } from './passwordRecovery';

export function ResetPasswordPage() {
  const { passwordRecoveryStatus, recoverySessionActive, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInvalid = error === 'La contraseña debe tener al menos 8 caracteres.';
  const confirmationInvalid = error === 'Las contraseñas no coinciden.';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateNewPassword(password, confirmation);
    if (validation) {
      setError(validation);
      return;
    }
    if (!recoverySessionActive || pending) return;
    setPending(true);
    setError(null);
    const result = await updatePassword(password);
    setPending(false);
    if (result.ok) setSuccess(true);
    else setError(result.message);
  }

  return (
    <PasswordRecoveryShell
      subtitle="Elige una contraseña segura para volver a administrar tu barbería."
      title="Crear nueva contraseña"
    >
      {passwordRecoveryStatus === 'checking' ? (
        <p aria-live="polite" className="login-page__message" role="status">Verificando el enlace de recuperación…</p>
      ) : success ? (
        <div aria-live="polite" className="login-page__form">
          <p className="login-page__message login-page__message--success" role="status">Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <Link className="login-page__recovery-link" to="/login">Volver al inicio de sesión</Link>
        </div>
      ) : !recoverySessionActive ? (
        <div className="login-page__form">
          <p className="login-page__message login-page__message--error" role="alert">El enlace de recuperación no es válido o venció.</p>
          <Link className="login-page__recovery-link" to="/forgot-password">Solicitar un nuevo enlace</Link>
          <Link className="login-page__recovery-link" to="/login">Volver al inicio de sesión</Link>
        </div>
      ) : (
        <form aria-busy={pending} className="login-page__form" onSubmit={handleSubmit}>
          <label className="login-page__field">
            <span>Nueva contraseña</span>
            <input aria-describedby={error ? 'reset-password-error' : undefined} aria-invalid={passwordInvalid} autoComplete="new-password" autoFocus disabled={pending} onChange={(event) => { setError(null); setPassword(event.target.value); }} required type="password" value={password} />
          </label>
          <label className="login-page__field">
            <span>Confirmar contraseña</span>
            <input aria-describedby={error ? 'reset-password-error' : undefined} aria-invalid={confirmationInvalid} autoComplete="new-password" disabled={pending} onChange={(event) => { setError(null); setConfirmation(event.target.value); }} required type="password" value={confirmation} />
          </label>
          <div aria-atomic="true" aria-live="polite" className="login-page__alerts">
            {error ? <p className="login-page__message login-page__message--error" id="reset-password-error" role="alert">{error}</p> : null}
          </div>
          <Button disabled={pending || !password || !confirmation} size="lg" type="submit">
            {pending ? <><span aria-hidden="true" className="login-page__spinner" />Actualizando contraseña…</> : 'Actualizar contraseña'}
          </Button>
        </form>
      )}
    </PasswordRecoveryShell>
  );
}
