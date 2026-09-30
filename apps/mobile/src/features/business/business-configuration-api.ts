import { getSupabase } from '@/lib/supabase';

export type BusinessConfiguration = {
  id: string;
  open: boolean;
  positionNotice: number;
  graceMinutes: number;
  priorityEvery: number;
};

export type ManagedQueue = {
  id: string;
  name: string;
  prefix: string;
  activeStations: number;
};

type BusinessConfigurationRow = {
  id: string;
  abierta: boolean;
  aviso_posiciones: number;
  minutos_gracia: number;
  preferencial_cada: number;
};

type ManagedQueueRow = {
  id: string;
  nombre: string;
  prefijo: string;
  puestos_activos: number;
};

function toConfiguration(row: BusinessConfigurationRow): BusinessConfiguration {
  return {
    id: row.id,
    open: row.abierta,
    positionNotice: row.aviso_posiciones,
    graceMinutes: row.minutos_gracia,
    priorityEvery: row.preferencial_cada,
  };
}

function toManagedQueue(row: ManagedQueueRow): ManagedQueue {
  return {
    id: row.id,
    name: row.nombre,
    prefix: row.prefijo,
    activeStations: row.puestos_activos,
  };
}

export async function getBusinessConfiguration(businessId: string): Promise<BusinessConfiguration | null> {
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('id, abierta, aviso_posiciones, minutos_gracia, preferencial_cada')
    .eq('id', businessId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toConfiguration(data as BusinessConfigurationRow) : null;
}

export async function updateBusinessConfiguration(
  businessId: string,
  configuration: Omit<BusinessConfiguration, 'id'>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('empresas')
    .update({
      abierta: configuration.open,
      aviso_posiciones: configuration.positionNotice,
      minutos_gracia: configuration.graceMinutes,
      preferencial_cada: configuration.priorityEvery,
    })
    .eq('id', businessId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getManagedQueues(businessId: string): Promise<ManagedQueue[]> {
  const { data, error } = await getSupabase()
    .from('filas')
    .select('id, nombre, prefijo, puestos_activos')
    .eq('empresa_id', businessId)
    .order('nombre');

  if (error) {
    throw new Error(error.message);
  }

  return (data as ManagedQueueRow[]).map(toManagedQueue);
}

export async function updateManagedQueue(
  businessId: string,
  queue: ManagedQueue,
): Promise<void> {
  const { error } = await getSupabase()
    .from('filas')
    .update({
      nombre: queue.name.trim(),
      prefijo: queue.prefix.trim().toUpperCase(),
      puestos_activos: queue.activeStations,
    })
    .eq('id', queue.id)
    .eq('empresa_id', businessId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createManagedQueue(
  businessId: string,
  queue: Omit<ManagedQueue, 'id'>,
): Promise<void> {
  const { error } = await getSupabase().from('filas').insert({
    empresa_id: businessId,
    nombre: queue.name.trim(),
    prefijo: queue.prefix.trim().toUpperCase(),
    puestos_activos: queue.activeStations,
  });

  if (error) {
    throw new Error(error.message);
  }
}
