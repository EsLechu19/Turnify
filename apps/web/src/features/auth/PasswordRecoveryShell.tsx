import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PasswordRecoveryShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="login-page">
      <section aria-label="Propuesta de valor de Turnify" className="login-page__visual login-page__brand-panel">
        <img alt="" className="login-page__image" src="/barbershop-login-hero.png" />
        <div className="login-page__visual-content">
          <img alt="" className="login-page__logo" src="/turnify-logo.png" />
          <p className="login-page__brand">TURNIFY <span>FOR BARBERS</span></p>
          <h2 className="login-page__brand-title">Tu barbería,<br />en su mejor ritmo.</h2>
          <p className="login-page__brand-subtitle">Organiza el día con claridad y ofrece una experiencia que invita a volver.</p>
        </div>
      </section>
      <section aria-labelledby="recovery-title" className="login-page__form-panel">
        <header className="login-page__header">
          <Link aria-label="Inicio de Turnify" className="login-page__mobile-brand" to="/login">
            <img alt="" src="/turnify-logo.png" />
            <span>TURNIFY</span>
          </Link>
          <span className="login-page__kicker">GESTIÓN DE BARBERÍAS</span>
          <h1 id="recovery-title">{title}</h1>
          <p>{subtitle}</p>
        </header>
        {children}
      </section>
    </main>
  );
}
