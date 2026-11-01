import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
    <main className="login-page">
      <section aria-label="Turnify for barbershops" className="login-page__visual">
        <img alt="" className="login-page__image" src="/barbershop-login-hero.png" />
        <div className="login-page__visual-content">
          <img alt="" className="login-page__logo" src="/turnify-logo.png" />
          <p className="login-page__brand">TURNIFY <span>FOR BARBERS</span></p>
          <p className="login-page__statement">Your craft.<br />Your shop.<br /><em>In rhythm.</em></p>
          <p className="login-page__caption">A better day behind the chair starts here.</p>
        </div>
        <span aria-hidden="true" className="login-page__visual-index">01 / 03</span>
      </section>

      <section aria-labelledby="login-title" className="login-page__form-panel">
        <header className="login-page__header">
          <Link aria-label="Turnify home" className="login-page__mobile-brand" to="/login">
            <img alt="" src="/turnify-logo.png" />
            <span>TURNIFY</span>
          </Link>
          <span className="login-page__kicker">BARBERSHOP MANAGEMENT</span>
          <h1 id="login-title">Sign in to your shop</h1>
          <p>Welcome back. Let’s get your day moving.</p>
        </header>

        <form className="login-page__form" onSubmit={handleSubmit}>
          <label className="login-page__field">
            <span>Email address</span>
            <input
              autoComplete="email"
              autoFocus
              disabled={pending}
              onChange={(event) => {
                clearError();
                setEmail(event.target.value);
              }}
              placeholder="you@yourshop.com"
              type="email"
              value={email}
            />
          </label>

          <label className="login-page__field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={pending}
              onChange={(event) => {
                clearError();
                setPassword(event.target.value);
              }}
              placeholder="Enter your password"
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="login-page__message login-page__message--error" role="alert">
              <Icon name="info" size={15} />
              <span>{error}</span>
            </p>
          ) : bounceMessage ? (
            <p className="login-page__message" role="status">
              <Icon name="info" size={15} />
              <span>{bounceMessage}</span>
            </p>
          ) : null}

          <Button disabled={!canSubmit} icon="arrow-right" size="lg" type="submit">
            {pending ? 'Signing you in…' : 'Sign in'}
          </Button>
        </form>

        {!isSupabaseConfigured() ? (
          <p className="login-page__configuration" role="status">
            Server connection is unavailable. Configure Supabase to sign in with an account.
          </p>
        ) : null}

        <footer className="login-page__footer">
          <span>New to Turnify?</span> <Link to="/register">Register your barbershop</Link>
        </footer>
        <p className="login-page__access-note">For shop administrators. Barbers can manage their day in the mobile app.</p>
      </section>
    </main>
  );
}
