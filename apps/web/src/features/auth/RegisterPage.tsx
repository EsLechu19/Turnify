import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/common';
import { isSupabaseConfigured } from '@/data/supabase';
import { createBusiness } from '@/data/live';
import { useAuth } from '@/state/AuthContext';

type Phase = 'form' | 'confirm-email' | 'done';

export function RegisterPage() {
  const { signUp, error, pending, clearError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [shopCode, setShopCode] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [creatingShop, setCreatingShop] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    shopName.trim().length > 0 &&
    !pending &&
    !creatingShop;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const outcome = await signUp(email, password, name);

    if (outcome === 'confirm-email') {
      setPhase('confirm-email');
      return;
    }

    if (outcome !== 'authenticated') {
      return;
    }

    setCreatingShop(true);
    setShopError(null);

    try {
      const shop = await createBusiness(shopName);
      setShopCode(shop.code);
      setPhase('done');
    } catch (reason) {
      setShopError(
        reason instanceof Error && reason.message.includes('Ya perteneces')
          ? 'Esta cuenta ya pertenece a una barbería. Entra al panel con ella.'
          : 'No pudimos crear tu barbería. Intenta de nuevo.',
      );
    } finally {
      setCreatingShop(false);
    }
  }

  if (phase === 'confirm-email') {
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
            <span className="eyebrow">Casi listo</span>
            <h1 className="auth__title">Confirma tu correo</h1>
            <p className="auth__lead muted">
              Te enviamos un enlace a {email.trim()}. Ábrelo y luego entra al panel: tu barbería se crea en el siguiente paso.
            </p>
          </div>

          <Link className="btn btn--secondary btn--lg" to="/login">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'done' && shopCode) {
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
            <span className="eyebrow">Barbería creada</span>
            <h1 className="auth__title">{shopName.trim()}</h1>
            <p className="auth__lead muted">
              Eres su administrador. Este es el código que va en tu mostrador:
            </p>
          </div>

          <p style={{ font: 'var(--text-display)', letterSpacing: '0.08em', margin: 0, textAlign: 'center' }}>
            {shopCode}
          </p>

          <Button size="lg" onClick={() => navigate('/', { replace: true })}>
            Entrar al panel
          </Button>
        </div>
      </div>
    );
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
          <span className="eyebrow">Nueva barbería</span>
          <h1 className="auth__title">Registra tu barbería</h1>
          <p className="auth__lead muted">
            Crea tu cuenta de administrador y tu local en un solo paso. Recibirás su código del mostrador.
          </p>
        </div>

        <form className="auth__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Tu nombre</span>
            <input
              autoComplete="name"
              autoFocus
              disabled={pending || creatingShop}
              onChange={(event) => {
                clearError();
                setName(event.target.value);
              }}
              placeholder="Tu nombre"
              type="text"
              value={name}
            />
          </label>

          <label className="field">
            <span>Correo</span>
            <input
              autoComplete="email"
              disabled={pending || creatingShop}
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
              autoComplete="new-password"
              disabled={pending || creatingShop}
              onChange={(event) => {
                clearError();
                setPassword(event.target.value);
              }}
              placeholder="Mínimo 6 caracteres"
              type="password"
              value={password}
            />
          </label>

          <label className="field">
            <span>Nombre de la barbería</span>
            <input
              autoComplete="organization"
              disabled={pending || creatingShop}
              onChange={(event) => {
                clearError();
                setShopName(event.target.value);
              }}
              placeholder="Ej. Barba Negra"
              type="text"
              value={shopName}
            />
          </label>

          {error ? (
            <p className="auth__error" role="alert">
              <Icon name="info" size={15} />
              <span>{error}</span>
            </p>
          ) : null}

          {shopError ? (
            <p className="auth__error" role="alert">
              <Icon name="info" size={15} />
              <span>{shopError}</span>
            </p>
          ) : null}

          <Button disabled={!canSubmit} icon="arrow-right" size="lg" type="submit">
            {pending ? 'Creando cuenta…' : creatingShop ? 'Creando barbería…' : 'Crear cuenta y barbería'}
          </Button>
        </form>

        {!isSupabaseConfigured() ? (
          <p className="auth__hint muted">
            Sin conexión al servidor: configura Supabase para registrar una barbería real.
          </p>
        ) : (
          <p className="auth__hint muted">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        )}
      </div>
    </div>
  );
}
