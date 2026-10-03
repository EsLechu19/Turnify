import { getSupabase } from '@/lib/supabase';

export type WorkerShop = { businessId: string; name: string; isCurrent: boolean };

export async function registerAsWorker(): Promise<void> {
  const { error } = await getSupabase().rpc('registrar_como_personal');
  if (error) throw new Error(error.message);
}

export async function getWorkerShops(): Promise<WorkerShop[]> {
  const { data, error } = await getSupabase().rpc('mis_empresas_personal');
  if (error) throw new Error(error.message);
  return (data ?? []).map((shop: { empresa_id: string; nombre: string; es_actual: boolean }) => ({ businessId: shop.empresa_id, name: shop.nombre, isCurrent: shop.es_actual }));
}

export async function selectWorkerShop(businessId: string): Promise<void> {
  const { error } = await getSupabase().rpc('seleccionar_mi_empresa_personal', { p_empresa_id: businessId });
  if (error) throw new Error(error.message);
}

export async function addWorkerByEmail(email: string): Promise<void> {
  const { error } = await getSupabase().rpc('agregar_personal_por_correo', { p_email: email.trim() });
  if (error) throw new Error(error.message);
}

export async function getShopWorkers(): Promise<Array<{ profileId: string; name: string | null; active: boolean }>> {
  const { data, error } = await getSupabase().rpc('personal_de_mi_empresa');
  if (error) throw new Error(error.message);
  return (data ?? []).map((worker: { perfil_id: string; nombre: string | null; activa: boolean }) => ({ profileId: worker.perfil_id, name: worker.nombre, active: worker.activa }));
}
