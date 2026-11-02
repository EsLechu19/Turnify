import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/common';
import { authStorage } from '@/data/authStorage';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/state/AuthContext';
import { getPasswordToggleProps, togglePasswordVisibility } from './passwordVisibility';

export function LoginPage() {
  const { signIn, signInWithGoogle, error, pending, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => authStorage.getPersistenceMode() === 'persistent');
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);
  const passwordToggle = getPasswordToggleProps(showPassword);
  const bounceMessage = (useLocation().state as { message?: string } | null)?.message;
  const credentialsInvalid = error === 'Correo o contraseña incorrectos.';

  const canSubmit = email.trim().length > 0 && password.length > 0 && !pending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await signIn(email, password, rememberMe);
  }

  async function handleGoogleSignIn() {
    if (pending || !isSupabaseConfigured()) return;
    setGooglePending(true);
    const started = await signInWithGoogle(rememberMe);
    if (!started) setGooglePending(false);
  }

  return (
    <main className="login-page">
      <div className="login-page__card">
        <section aria-label="Propuesta de valor de Turnify" className="login-page__visual login-page__brand-panel">
          <img alt="" className="login-page__image" src="/barbershop-login-hero.png" />
          <div className="login-page__visual-content">
            <div className="login-page__brand-lockup">
              <img alt="" className="login-page__logo" src="/turnify-logo.png" />
              <span>TURNIFY</span>
            </div>
            <h2 className="login-page__brand-title">Gestiona turnos con rapidez y orden.</h2>
            <p className="login-page__brand-subtitle">Todo lo que necesitas para organizar tu barbería desde un solo lugar.</p>
            <ul className="login-page__benefits">
              <li>
                <span className="login-page__benefit-icon"><Icon name="clock" size={17} /></span>
                <span><strong>Control de turnos</strong><small>Controla la agenda y reduce esperas.</small></span>
              </li>
              <li>
                <span className="login-page__benefit-icon"><Icon name="star" size={17} /></span>
                <span><strong>Mejor experiencia</strong><small>Ofrece una atención más ágil.</small></span>
              </li>
              <li>
                <span className="login-page__benefit-icon"><Icon name="chart" size={17} /></span>
                <span><strong>Crece tu barbería</strong><small>Convierte cada visita en crecimiento.</small></span>
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="login-title" className="login-page__form-panel">
          <header className="login-page__header">
            <span className="login-page__kicker">GESTIÓN DE BARBERÍAS</span>
            <h1 id="login-title">Iniciar sesión</h1>
            <p>Ingresa tus datos para acceder al panel.</p>
          </header>

          <form aria-busy={pending} className="login-page__form" onSubmit={handleSubmit}>
            <div aria-atomic="true" aria-live="polite" className="login-page__alerts">
              {error ? (
                <p className="login-page__message login-page__message--error" id={credentialsInvalid ? 'login-credentials-error' : undefined} role="alert">
                  <Icon name="info" size={15} />
                  <span>{error}</span>
                </p>
              ) : persistenceWarning ? (
                <p className="login-page__message login-page__message--error" role="alert">
                  <Icon name="info" size={15} />
                  <span>{persistenceWarning}</span>
                </p>
              ) : bounceMessage ? (
                <p className="login-page__message login-page__message--success" role="status">
                  <Icon name="info" size={15} />
                  <span>{bounceMessage}</span>
                </p>
              ) : null}
            </div>

          <label className="login-page__field">
            <span>Correo electrónico</span>
            <span className="login-page__input-wrap">
              <Icon className="login-page__field-icon" name="user" size={16} />
              <input
                aria-describedby={credentialsInvalid ? 'login-credentials-error' : undefined}
                aria-invalid={credentialsInvalid}
                autoComplete="email"
                autoFocus
                disabled={pending}
                onChange={(event) => {
                  clearError();
                  setEmail(event.target.value);
                }}
                placeholder="tu@barberia.com"
                type="email"
                value={email}
              />
            </span>
          </label>

          <label className="login-page__field">
            <span>Contraseña</span>
            <span className="login-page__input-wrap">
              <Icon className="login-page__field-icon" name="lock" size={16} />
              <input
                aria-describedby={credentialsInvalid ? 'login-credentials-error' : undefined}
                aria-invalid={credentialsInvalid}
                autoComplete="current-password"
                disabled={pending}
                onChange={(event) => {
                  clearError();
                  setPassword(event.target.value);
                }}
                placeholder="Ingresa tu contraseña"
                type={passwordToggle.inputType}
                value={password}
              />
              <button
                aria-label={passwordToggle.label}
                aria-pressed={passwordToggle.pressed}
                className="login-page__password-toggle"
                disabled={pending}
                onClick={() => setShowPassword(togglePasswordVisibility)}
                type="button"
              >
                <Icon name={passwordToggle.iconName} size={16} />
              </button>
            </span>
          </label>

            <div className="login-page__form-meta">
              <label className="login-page__remember">
                <input
                  checked={rememberMe}
                  onChange={(event) => {
                    const nextValue = event.target.checked;
                    const nextMode = nextValue ? 'persistent' : 'session';
                    if (authStorage.setPersistenceMode(nextMode)) {
                      setRememberMe(nextValue);
                      setPersistenceWarning(null);
                    } else {
                      setRememberMe(authStorage.getPersistenceMode() === 'persistent');
                      setPersistenceWarning('No pudimos cambiar la duración de la sesión en este navegador.');
                    }
                  }}
                  type="checkbox"
                />
                <span>Recordarme</span>
              </label>
              <Link className="login-page__recovery-link" to="/forgot-password">¿Olvidaste tu contraseña?</Link>
            </div>

            <Button disabled={!canSubmit} icon={pending ? undefined : 'arrow-right'} size="lg" type="submit">
              {pending && !googlePending ? <><span aria-hidden="true" className="login-page__spinner" />Iniciando sesión…</> : 'Entrar al panel'}
            </Button>
            <div className="login-page__separator"><span>o</span></div>
            <Button className="login-page__google-button" disabled={pending || !isSupabaseConfigured()} onClick={handleGoogleSignIn} size="lg" type="button" variant="secondary">
              {googlePending ? <><span aria-hidden="true" className="login-page__spinner login-page__spinner--dark" />Conectando con Google…</> : 'Continuar con Google'}
            </Button>
          </form>

          {!isSupabaseConfigured() ? (
            <p className="login-page__configuration" role="status">
              La conexión con el servidor no está disponible. Configura Supabase para iniciar sesión.
            </p>
          ) : null}

          <footer className="login-page__footer">
            <span>¿Aún no tienes cuenta?</span> <Link to="/register">Registra tu barbería</Link>
          </footer>
          <p className="login-page__access-note">Solo para administradores de barberías. Los barberos pueden gestionar su jornada desde la aplicación móvil.</p>
        </section>
      </div>
    </main>
  );
}
