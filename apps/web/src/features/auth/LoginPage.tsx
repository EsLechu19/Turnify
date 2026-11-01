import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/common';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/state/AuthContext';

export function LoginPage() {
  const { signIn, error, pending, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const bounceMessage = (useLocation().state as { message?: string } | null)?.message;
  const credentialsInvalid = error === 'Correo o contraseña incorrectos.';

  const canSubmit = email.trim().length > 0 && password.length > 0 && !pending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await signIn(email, password);
  }

  return (
    <main className="login-page">
      <section aria-label="Propuesta de valor de Turnify" className="login-page__visual login-page__brand-panel">
        <img alt="" className="login-page__image" src="/barbershop-login-hero.png" />
        <div className="login-page__visual-content">
          <img alt="" className="login-page__logo" src="/turnify-logo.png" />
          <p className="login-page__brand">TURNIFY <span>FOR BARBERS</span></p>
          <h2 className="login-page__brand-title">Tu barbería,<br />en su mejor ritmo.</h2>
          <p className="login-page__brand-subtitle">Organiza el día con claridad y ofrece una experiencia que invita a volver.</p>
          <ul className="login-page__benefits">
            <li><Icon name="clock" size={16} /><span>Control de turnos</span></li>
            <li><Icon name="star" size={16} /><span>Mejor experiencia</span></li>
            <li><Icon name="chart" size={16} /><span>Crecimiento de tu barbería</span></li>
          </ul>
        </div>
        <span aria-hidden="true" className="login-page__visual-index">01 / 03</span>
      </section>

      <section aria-labelledby="login-title" className="login-page__form-panel">
        <header className="login-page__header">
          <Link aria-label="Inicio de Turnify" className="login-page__mobile-brand" to="/login">
            <img alt="" src="/turnify-logo.png" />
            <span>TURNIFY</span>
          </Link>
          <span className="login-page__kicker">GESTIÓN DE BARBERÍAS</span>
          <h1 id="login-title">Iniciar sesión en tu barbería</h1>
          <p>Accede a tu cuenta para administrar el día.</p>
        </header>

        <form aria-busy={pending} className="login-page__form" onSubmit={handleSubmit}>
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
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="login-page__password-toggle"
                disabled={pending}
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                <Icon name={showPassword ? 'eye-slash' : 'eye'} size={16} />
              </button>
            </span>
          </label>

          <div aria-atomic="true" aria-live="polite" className="login-page__alerts">
            {error ? (
              <p className="login-page__message login-page__message--error" id={credentialsInvalid ? 'login-credentials-error' : undefined} role="alert">
                <Icon name="info" size={15} />
                <span>{error}</span>
              </p>
            ) : bounceMessage ? (
              <p className="login-page__message login-page__message--success" role="status">
                <Icon name="info" size={15} />
                <span>{bounceMessage}</span>
              </p>
            ) : null}
          </div>

          <Button disabled={!canSubmit} icon={pending ? undefined : 'arrow-right'} size="lg" type="submit">
            {pending ? <><span aria-hidden="true" className="login-page__spinner" />Iniciando sesión…</> : 'Iniciar sesión'}
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
    </main>
  );
}
