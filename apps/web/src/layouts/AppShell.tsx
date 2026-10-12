import { Outlet } from 'react-router-dom';

import { useShop } from '@/state/ShopContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Chrome shared by every section: sidebar, topbar and the routed page body. */
export function AppShell() {
  const { open } = useShop();

  return (
    <div className="shell">
      <Sidebar isOpen={open ?? true} />

      <div className="shell__main">
        <Topbar />

        <main className="shell__body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}