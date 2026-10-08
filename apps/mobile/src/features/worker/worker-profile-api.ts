import { getSupabase } from '@/lib/supabase';

export type WorkerProfileDetails = { name: string; phone: string };

export type WorkerAssignedService = {
  serviceId: string;
  name: string;
  description: string | null;
  durationSeconds: number;
  priceCents: number | null;
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

export async function getMyWorkerServices(): Promise<WorkerAssignedService[]> {
  const { data: barberData, error: barberError } = await getSupabase().rpc('mi_barbero_actual_id');
  if (barberError) {
    const message = barberError.message.toLowerCase();
    if (message.includes('no tienes un perfil de barbero') || message.includes('selecciona una barbería')) return [];
    throw new Error(barberError.message);
  }
  const barberId = barberData as string | null;
  if (!barberId) return [];

  const { data: links, error: linksError } = await getSupabase()
    .from('barbero_servicios')
    .select('servicio_id')
    .eq('barbero_id', barberId);

  if (linksError) throw new Error(linksError.message);
  const serviceIds = ((links ?? []) as Array<{ servicio_id: string }>).map((link) => link.servicio_id);
  if (serviceIds.length === 0) return [];

  const { data: services, error: servicesError } = await getSupabase()
    .from('servicios')
    .select('id,nombre,descripcion,duracion_estimada_seg,precio_referencia_centavos')
    .in('id', serviceIds)
    .eq('activo', true)
    .order('nombre');

  if (servicesError) throw new Error(servicesError.message);
  return ((services ?? []) as Array<{ id: string; nombre: string; descripcion: string | null; duracion_estimada_seg: number; precio_referencia_centavos: number | null }>).map((service) => ({
    serviceId: service.id,
    name: service.nombre,
    description: service.descripcion,
    durationSeconds: service.duracion_estimada_seg,
    priceCents: service.precio_referencia_centavos,
  }));
}
