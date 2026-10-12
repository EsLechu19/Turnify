import { useLocation, useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '@/components/Icon';
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
  const { session } = useAuth();
  const { business } = useShop();
  const businessName = business?.name ?? 'Turnify';
  const businessBranch = business?.branch ?? '';
  const businessOwner = business?.owner ?? 'Panel';

  const isCurrent = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

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

      <nav className="sidebar__section" aria-label="Secciones del panel">
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
          <button
            className="sidebar__status"
            onClick={() => navigate('/')}
            title="Ir a Inicio para abrir o cerrar"
            type="button"
          >
            {isOpen ? (
              <>
                <span className="sidebar__badge--open">●</span> Local abierto
              </>
            ) : (
              <>
                <span className="sidebar__badge--closed">●</span> Local cerrado
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}