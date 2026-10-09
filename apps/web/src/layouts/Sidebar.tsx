import { useLocation, useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '@/components/Icon';
import { Button } from '@/components/common';
import { useAuth } from '@/state/AuthContext';
import { useShop } from '@/state/ShopContext';
import { initialsOf } from '@/utils/format';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'grid' },
  { to: '/cola', label: 'Cola en tiempo real', icon: 'list' },
  { to: '/servicios', label: 'Servicios', icon: 'ticket' },
  { to: '/equipo', label: 'Barberos y empleados', icon: 'users' },
  { to: '/historial', label: 'Historial y reportes', icon: 'chart' },
  { to: '/configuracion', label: 'Configuración', icon: 'settings' },
];

/**
 * Rendered as `<button>` rather than `<NavLink>` on purpose: the stylesheet has
 * no `text-decoration` reset, so an anchor would underline every item.
 */
export function Sidebar({ isOpen }: { isOpen: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session, signOut } = useAuth();
  const { business } = useShop();
  const businessName = business?.name ?? 'Turnify';
  const businessBranch = business?.branch ?? '';
  const businessOwner = business?.owner ?? 'Panel';

  const isCurrent = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img alt="" src="/turnify-logo.png" />
        <div>
          <strong>{businessName}</strong>
          <span>Panel</span>
          <span>{businessBranch}</span>
        </div>
      </div>

      <div className="sidebar__salon-status">
        <span className="sidebar__salon-badge" aria-label="Estado del salón">
          <span className="sidebar__salon-dot" />
        </span>
        <span className="sidebar__salon-label">Estado del salón</span>
      </div>

      <nav className="sidebar__section" aria-label="Secciones del panel">
        <span className="sidebar__label">Operación</span>
        {navItems.map((item) => (
          <button
            aria-current={isCurrent(item.to) ? 'page' : undefined}
            className="sidebar__item"
            key={item.to}
            onClick={() => navigate(item.to)}
            type="button"
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <span className="sidebar__avatar">{initialsOf(session?.user.name ?? businessOwner)}</span>
          <div className="sidebar__user-info">
            <strong>{session?.user.name ?? businessOwner}</strong>
            <span className="sidebar__role">
              {session?.user.role === 'barbero' ? 'Barbero' : 'Administrador'}
            </span>
          </div>
        </div>
        <div className="sidebar__divider" />
        <div className="sidebar__session">
          <span className="sidebar__status">
            {isOpen ? (
              <>
                <span className="sidebar__badge--open">●</span> Local abierto
              </>
            ) : (
              <>
                <span className="sidebar__badge--closed">●</span> Local cerrado
              </>
            )}
          </span>
          <span className="sidebar__shift">Turno: Mañana (8:00 - 14:00)</span>
        </div>
        <Button icon="logout" onClick={handleSignOut} variant="danger">
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}