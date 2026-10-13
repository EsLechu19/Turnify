import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { useAuth } from '@/state/AuthContext';
import { useShop } from '@/state/ShopContext';
import { initialsOf } from '@/utils/format';

export function Topbar() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { business, branch, open } = useShop();
  const businessName = business?.name ?? 'Mi barbería';
  const branchName = branch?.name && branch.name !== businessName ? branch.name : 'Sucursal principal';
  const businessOwner = business?.owner ?? 'Administrador';
  const userName = session?.user.name ?? businessOwner;
  const roleLabel = session?.user.role === 'barbero' ? 'Barbero' : 'Administrador';
  const statusLabel = open === null ? 'Estado no disponible' : open ? 'Abierto' : 'Cerrado';

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar__context">
        <strong>{businessName}</strong>
        <span>{branchName}</span>
      </div>
      <div className="topbar__right">
        <button className="topbar__status" type="button" onClick={() => navigate('/')} aria-label="Ir a Inicio para gestionar el estado del local">
          <span className={`topbar__status-dot ${open === null ? 'topbar__status-dot--unknown' : open ? 'topbar__status-dot--open' : 'topbar__status-dot--closed'}`} aria-hidden />
          <span>{statusLabel}</span>
          <span className="sr-only">Ir a Inicio para gestionar el estado del local</span>
        </button>
        <Button aria-label="Cerrar sesión" icon="logout" variant="ghost" size="lg" onClick={handleSignOut} />
        <div className="topbar__user">
          <span className="topbar__avatar">{initialsOf(userName)}</span>
          <div className="topbar__user-info">
            <strong>{userName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
