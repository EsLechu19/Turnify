import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { getCommercialCatalog } from '@/features/queue/commercial-queue-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { normalizeBusinessCode, translateQueueError } from '@/features/queue/queue-api';

export default function ShopScreen() {
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const code = normalizeBusinessCode(rawCode ?? '');
  const { beginDiscovery } = useGuestFlow();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function discover() {
      if (!code) { setError('Ingresa un código de barbería válido.'); setIsLoading(false); return; }
      setIsLoading(true); setError(null);
      try {
        const catalog = await getCommercialCatalog(code);
        if (active) beginDiscovery(code, catalog);
      } catch (reason) {
        if (active) setError(translateQueueError(reason instanceof Error ? reason.message : ''));
      } finally { if (active) setIsLoading(false); }
    }
    void discover();
    return () => { active = false; };
  }, [beginDiscovery, code]);

  const { draft } = useGuestFlow();
  return <CustomerPage><CustomerHeading eyebrow="Barbería identificada" title={draft?.catalog.name ?? 'Buscando barbería'} detail="Verifica el negocio antes de elegir tu servicio." />
    {isLoading && <CustomerState label="Consultando la barbería…" isLoading />}
    {error && <CustomerState label={error} detail="Revisa el código mostrado por la barbería." action={() => router.replace('/')} />}
    {draft && !isLoading && <><CustomerCard><CustomerHeading title={draft.catalog.name} detail={draft.catalog.open ? 'Esta barbería recibe turnos ahora.' : 'Esta barbería no recibe turnos ahora.'} /></CustomerCard>
      <CustomerButton label="Elegir servicio" disabled={!draft.catalog.open} onPress={() => router.push('/(public)/service')} />
      <CustomerButton label="Ingresar otro código" variant="secondary" onPress={() => router.replace('/')} /></>}
  </CustomerPage>;
}
