import { Button, PageHeader, TwoColumnGrid } from '@/components/common';
import { panelRepository } from '@/data/repositories';
import { useQueue } from '@/state/QueueContext';

const business = panelRepository.business();

import { ActiveQueueCard } from './components/ActiveQueueCard';
import { BarberStationsCard } from './components/BarberStationsCard';
import { DailySummaryCard } from './components/DailySummaryCard';
import { StatCards } from './components/StatCards';
import { HourlyDemandCard } from '../history/components/HourlyDemandCard';

export function DashboardPage() {
  const { tickets, team, stats, next, changeStatus } = useQueue();

  const handleCall = (id: string) => changeStatus(id, 'llamado');
  const handleAssign = (id: string) => changeStatus(id, 'atencion');

  return (
    <>
      <PageHeader
        title={business.name}
        subtitle="Panel operativo"
        actions={
          <>
            <Button variant="secondary" icon="pause" onClick={() => {}}>
              Pausar fila temporal
            </Button>
            <Button variant="primary" icon="arrow-right" onClick={() => next && changeStatus(next.id, next.status === 'llamado' ? 'atencion' : 'llamado')}>
              Llamar siguiente turno
            </Button>
          </>
        }
      />

      <StatCards stats={stats} />

      <TwoColumnGrid>
        <ActiveQueueCard
          tickets={tickets}
          onCall={handleCall}
          onAssign={handleAssign}
          occupiedCount={team.filter(m => m.availability === 'atencion').length}
        />
        <BarberStationsCard team={team} />
      </TwoColumnGrid>

      <TwoColumnGrid>
        <HourlyDemandCard tickets={tickets} />
        <DailySummaryCard />
      </TwoColumnGrid>
    </>
  );
}