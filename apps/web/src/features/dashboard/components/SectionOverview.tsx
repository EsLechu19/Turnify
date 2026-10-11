import { useNavigate } from 'react-router-dom';

import { Button, Card, CardHead } from '@/components/common';

interface SectionEntry {
  to: '/equipo' | '/servicios' | '/historial' | '/configuracion';
  title: string;
  detail: string;
  action: string;
}

/**
 * Global overview: what each panel section holds and where to open it.
 * Live numbers only where the dashboard already owns them (team); everything
 * else is orientation copy plus a link. No queue/team detail is duplicated
 * here — the Tier 1 verdict owns today's live operation.
 */
export function SectionOverview({ availableCount, teamSize }: { availableCount: number; teamSize: number }) {
  const navigate = useNavigate();

  const teamDetail =
    teamSize === 0 ? 'Sin personal registrado todavía.' : `${availableCount} disponibles de ${teamSize} en el equipo.`;

  const sections: SectionEntry[] = [
    {
      to: '/equipo',
      title: 'Barberos y empleados',
      detail: `Quién atiende hoy y su disponibilidad. ${teamDetail}`,
      action: 'Ver equipo',
    },
    {
      to: '/servicios',
      title: 'Servicios',
      detail: 'Catálogo de servicios con su duración.',
      action: 'Ver servicios',
    },
    {
      to: '/historial',
      title: 'Historial y reportes',
      detail: 'Turnos pasados, asistencia y satisfacción.',
      action: 'Ver historial',
    },
    {
      to: '/configuracion',
      title: 'Configuración',
      detail: 'Reglas del local: estado, tiempos y avisos.',
      action: 'Ver configuración',
    },
  ];

  return (
    <Card>
      <CardHead detail="Qué hay en cada sección del panel" title="Secciones del panel" />
      <div style={{ display: 'grid', gap: 10 }}>
        {sections.map((section) => (
          <div key={section.to} style={{ alignItems: 'center', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            <div>
              <strong style={{ font: 'var(--text-body-strong)' }}>{section.title}</strong>
              <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
                {section.detail}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(section.to)}>
              {section.action}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
