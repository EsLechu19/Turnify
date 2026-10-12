import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/common';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/state/AuthContext';

export function LoginPage() {
  const { signIn, error, pending, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const bounceMessage = (useLocation().state as { message?: string } | null)?.message;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !pending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await signIn(email, password);
  }

  return (
    <div className="auth">
      <div className="auth__panel">
        <header className="auth__head">
          <img alt="" className="auth__logo" src="/turnify-logo.png" />
          <div className="auth__names">
            <strong className="auth__name">Turnify · Barbería</strong>
            <span className="auth__tagline">Gestión de turnos y barbería</span>
          </div>
        </header>

        <div className="auth__intro">
          <span className="eyebrow">Administradores</span>
          <h1 className="auth__title">Iniciar sesión</h1>
          <p className="auth__lead muted">
            Solo administradores. ¿Eres barbero? Opera desde la app móvil.
          </p>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Correo</span>
            <input
              autoComplete="email"
              autoFocus
              disabled={pending}
              onChange={(event) => {
                clearError();
                setEmail(event.target.value);
              }}
              placeholder="tu@correo.com"
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              disabled={pending}
              onChange={(event) => {
                clearError();
                setPassword(event.target.value);
              }}
              placeholder="Tu contraseña"
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="auth__error" role="alert">
              <Icon name="info" size={15} />
              <span>{error}</span>
            </p>
          ) : bounceMessage ? (
            <p className="auth__hint muted" role="status">
              <Icon name="info" size={15} />
              <span>{bounceMessage}</span>
            </p>
          ) : null}

          <Button disabled={!canSubmit} icon="arrow-right" size="lg" type="submit">
            {pending ? 'Verificando…' : 'Entrar al panel'}
          </Button>
        </form>

        {!isSupabaseConfigured() ? (
          <p className="auth__hint muted">
            Sin conexión al servidor: configura Supabase para entrar con una cuenta real.
          </p>
        ) : null}
      </div>
    </div>
  );
}