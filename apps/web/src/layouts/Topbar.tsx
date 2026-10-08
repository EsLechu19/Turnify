import { Icon } from '@/components/Icon';
import { Button } from '@/components/common';
import { panelRepository } from '@/data/repositories';

const business = panelRepository.business();

export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__brand">
          <img alt="" src="/turnify-logo.png" />
          <strong>{business.name}</strong>
        </div>
      </div>
      <div className="topbar__right">
        <div className="topbar__search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar cliente, servicio..." />
        </div>
        <Button aria-label="Notificaciones" icon="bell" variant="ghost" size="lg" />
        <div className="topbar__user">
          <span className="topbar__avatar">ER</span>
          <div className="topbar__user-info">
            <strong>{business.owner}</strong>
            <span>Administrador</span>
          </div>
        </div>
      </div>
    </header>
  );
}