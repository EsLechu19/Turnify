import { getSupabase } from '@/lib/supabase';

export type WorkerProfileDetails = { name: string; phone: string };

export type WorkerAssignedService = {
  serviceId: string;
  name: string;
  description: string | null;
  durationSeconds: number;
  priceCents: number | null;
};

export type WorkerServiceGroup = {
  businessId: string;
  businessName: string;
  isCurrent: boolean;
  services: WorkerAssignedService[];
};

export async function getMyWorkerProfileDetails(): Promise<WorkerProfileDetails> {
  const { data: authData, error: authError } = await getSupabase().auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = authData.user?.id;
  if (!userId) throw new Error('No hay sesión activa');

  const { data, error } = await getSupabase()
    .from('perfiles')
    .select('nombre,telefono')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return { name: data?.nombre ?? '', phone: data?.telefono ?? '' };
}

export async function updateMyWorkerProfileDetails(details: WorkerProfileDetails): Promise<WorkerProfileDetails> {
  const { data: authData, error: authError } = await getSupabase().auth.getUser();
  if (authError) throw new Error(authError.message);
  const userId = authData.user?.id;
  if (!userId) throw new Error('No hay sesión activa');

  const { data, error } = await getSupabase()
    .from('perfiles')
    .update({ nombre: details.name.trim() || null, telefono: details.phone.trim() || null })
    .eq('id', userId)
    .select('nombre,telefono')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return { name: data?.nombre ?? '', phone: data?.telefono ?? '' };
}

export async function getMyWorkerServices(): Promise<WorkerServiceGroup[]> {
  const { data, error } = await getSupabase().rpc('mi_catalogo_perfil_personal');
  if (!error) {
    const groups = new Map<string, WorkerServiceGroup>();
    for (const row of (data ?? []) as Array<{
      empresa_id: string;
      empresa_nombre: string;
      es_actual: boolean;
      servicio_id: string | null;
      servicio_nombre: string | null;
      servicio_descripcion: string | null;
      duracion_estimada_seg: number | null;
      precio_referencia_centavos: number | null;
    }>) {
      const group = groups.get(row.empresa_id) ?? {
        businessId: row.empresa_id,
        businessName: row.empresa_nombre,
        isCurrent: row.es_actual,
        services: [],
      };
      if (row.servicio_id) {
        group.services.push({
          serviceId: row.servicio_id,
          name: row.servicio_nombre ?? 'Servicio',
          description: row.servicio_descripcion,
          durationSeconds: row.duracion_estimada_seg ?? 0,
          priceCents: row.precio_referencia_centavos,
        });
      }
      groups.set(row.empresa_id, group);
    }
    return [...groups.values()];
  }

  // Fallback when the 0045 RPC is not applied yet (function missing).
  // Shows at least the current shop with its assigned services.
  const missingFunction = error.message.toLowerCase().includes('does not exist')
    || error.message.toLowerCase().includes('no existe')
    || error.message.includes('mi_catalogo_perfil_personal');
  if (!missingFunction) throw new Error(error.message);

  const { data: shopsData } = await getSupabase().rpc('mis_empresas_personal');
  const shops = ((shopsData ?? []) as Array<{ empresa_id: string; nombre: string; es_actual: boolean }>)
    .map((shop) => ({
      businessId: shop.empresa_id,
      businessName: shop.nombre,
      isCurrent: shop.es_actual,
      services: [] as WorkerServiceGroup['services'],
    }));
  if (shops.length === 0) return [];

  const { data: barberData, error: barberError } = await getSupabase().rpc('mi_barbero_actual_id');
  if (barberError) return shops;
  const barberId = barberData as string | null;
  if (!barberId) return shops;

  const { data: links } = await getSupabase()
    .from('barbero_servicios')
    .select('servicio_id')
    .eq('barbero_id', barberId);
  const serviceIds = ((links ?? []) as Array<{ servicio_id: string }>).map((link) => link.servicio_id);
  if (serviceIds.length === 0) return shops;

  const { data: services, error: servicesError } = await getSupabase()
    .from('servicios')
    .select('id,nombre,descripcion,duracion_estimada_seg,precio_referencia_centavos')
    .in('id', serviceIds)
    .eq('activo', true)
    .order('nombre');
  if (servicesError) return shops;

  const current = shops.find((shop) => shop.isCurrent) ?? shops[0];
  current.services = ((services ?? []) as Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    duracion_estimada_seg: number;
    precio_referencia_centavos: number | null;
  }>).map((service) => ({
    serviceId: service.id,
    name: service.nombre,
    description: service.descripcion,
    durationSeconds: service.duracion_estimada_seg,
    priceCents: service.precio_referencia_centavos,
  }));
  return shops;
}
