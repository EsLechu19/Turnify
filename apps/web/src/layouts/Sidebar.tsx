import { useLocation, useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '@/components/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'grid' },
  { to: '/servicios', label: 'Servicios', icon: 'ticket' },
  { to: '/equipo', label: 'Equipo', icon: 'users' },
  { to: '/historial', label: 'Reportes', icon: 'chart' },
  { to: '/configuracion', label: 'Configuración', icon: 'settings' },
  { to: '/cuenta', label: 'Mi cuenta', icon: 'user' },
];

/**
 * Rendered as `<button>` rather than `<NavLink>` on purpose: the stylesheet has
 * no `text-decoration` reset, so an anchor would underline every item.
 */
export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isCurrent = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img alt="Turnify" src="/turnify-logo.png" />
        <strong>Turnify</strong>
      </div>

      <nav className="sidebar__section" aria-label="Secciones del panel">
        {navItems.map((item) => (
          <button
            aria-current={isCurrent(item.to) ? 'page' : undefined}
            className="sidebar__item"
            key={item.to}
            onClick={() => navigate(item.to)}
            title={item.label}
            type="button"
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

    </aside>
  );
}
