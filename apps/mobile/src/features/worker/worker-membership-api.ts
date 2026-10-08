import { getSupabase } from '@/lib/supabase';

export type WorkerShop = { businessId: string; name: string; isCurrent: boolean };
export type PendingWorkerRequest = { businessId: string; name: string; status: 'requested' };
export type ShopWorkerRequest = { requestId: string; name: string | null; requestedAt: string };

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

export async function generateWorkerInvitationCode(email: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('generar_codigo_invitacion_personal', { p_correo: email.trim() });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getShopWorkers(): Promise<Array<{ profileId: string; name: string | null; active: boolean }>> {
  const { data, error } = await getSupabase().rpc('personal_de_mi_empresa');
  if (error) throw new Error(error.message);
  return (data ?? []).map((worker: { perfil_id: string; nombre: string | null; activa: boolean }) => ({ profileId: worker.perfil_id, name: worker.nombre, active: worker.activa }));
}

export async function requestWorkerInvitation(code: string): Promise<void> {
  const { error } = await getSupabase().rpc('solicitar_acceso_codigo_publico', { p_codigo: code.trim() });
  if (error) throw new Error('No se pudo enviar la solicitud. Verifica el código de la barbería e inténtalo nuevamente.');
}

export async function getMyPendingWorkerRequests(): Promise<PendingWorkerRequest[]> {
  const { data, error } = await getSupabase().rpc('mis_solicitudes_invitacion_personal');
  if (error) throw new Error(error.message);
  return (data ?? []).map((request: { empresa_id: string; nombre: string }) => ({ businessId: request.empresa_id, name: request.nombre, status: 'requested' }));
}

export async function getShopWorkerRequests(): Promise<ShopWorkerRequest[]> {
  const { data, error } = await getSupabase().rpc('solicitudes_personal_de_mi_empresa');
  if (error) throw new Error(error.message);
  return (data ?? []).map((request: { solicitud_id: string; nombre: string | null; solicitada_en: string }) => ({ requestId: request.solicitud_id, name: request.nombre, requestedAt: request.solicitada_en }));
}

export async function resolveWorkerRequest(requestId: string, approve: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('resolver_solicitud_invitacion_personal', { p_solicitud_id: requestId, p_aprobar: approve });
  if (error) throw new Error(error.message);
}
