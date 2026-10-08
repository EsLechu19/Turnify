import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Chrome shared by every section: sidebar, topbar and the routed page body. */
export function AppShell() {
  return (
    <div className="shell">
      <Sidebar isOpen />

      <div className="shell__main">
        <Topbar />

        <main className="shell__body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}