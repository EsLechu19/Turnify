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
  if (error) throw new Error(error.message);

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
