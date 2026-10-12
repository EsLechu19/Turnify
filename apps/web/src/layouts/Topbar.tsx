import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { useAuth } from '@/state/AuthContext';
import { useShop } from '@/state/ShopContext';
import { computeAlerts } from '@/data/compute';
import { useQueue } from '@/state/QueueContext';
import { initialsOf } from '@/utils/format';

export function Topbar() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { business } = useShop();
  const { tickets, team } = useQueue();
  const businessOwner = business?.owner ?? 'Administrador';
  const userName = session?.user.name ?? businessOwner;
  const roleLabel = session?.user.role === 'barbero' ? 'Barbero' : 'Administrador';
  const alertCount = computeAlerts(tickets, team).length;

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar__right">
        <Button
          aria-label={alertCount === 0 ? 'Sin alertas, ir a Inicio' : `${alertCount} alertas, ir a Inicio`}
          icon="bell"
          variant="ghost"
          size="lg"
          onClick={() => navigate('/')}
        >
          {alertCount > 0 ? <span aria-hidden>{alertCount}</span> : null}
        </Button>
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
