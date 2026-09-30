import { getSupabase } from '@/lib/supabase';

export type CreateBusinessInput = {
  name: string;
  fiscalId: string;
  email: string;
  phone: string;
  address: string;
};

export type Business = {
  id: string;
  name: string;
  code: string;
};

export type PersonalInvitation = {
  token: string;
};

type BusinessRow = {
  id: string;
  nombre: string;
  codigo: string;
};

function nullableValue(value: string): string | null {
  return value.trim() || null;
}

function toBusiness(row: BusinessRow): Business {
  return { id: row.id, name: row.nombre, code: row.codigo };
}

export async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const { data, error } = await getSupabase().rpc('crear_empresa', {
    p_nombre: input.name.trim(),
    p_id_fiscal: nullableValue(input.fiscalId),
    p_correo: nullableValue(input.email),
    p_telefono: nullableValue(input.phone),
    p_direccion: nullableValue(input.address),
  });

  if (error) {
    throw new Error(error.message);
  }

  return toBusiness(data as unknown as BusinessRow);
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('id, nombre, codigo')
    .eq('id', businessId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toBusiness(data as unknown as BusinessRow) : null;
}

export async function createPersonalInvitation(email: string): Promise<PersonalInvitation> {
  const { data, error } = await getSupabase().rpc('crear_invitacion', {
    p_email: email.trim() || undefined,
    p_rol: 'personal',
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token: (data as { token: string }).token };
}

export async function acceptPersonalInvitation(token: string): Promise<void> {
  const { error } = await getSupabase().rpc('aceptar_invitacion', {
    p_token: token.trim().toLowerCase(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function translateInvitationError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('venc') || normalized.includes('expir')) {
    return 'Esta invitación venció. Solicita una nueva invitación al administrador.';
  }
  if (normalized.includes('inválid') || normalized.includes('inval') || normalized.includes('no encontrada')) {
    return 'El código de invitación no es válido. Revisa el código e intenta de nuevo.';
  }
  if (normalized.includes('ya fue aceptada') || normalized.includes('ya acept')) {
    return 'Esta invitación ya fue utilizada. Solicita una nueva invitación al administrador.';
  }
  if (normalized.includes('debes iniciar sesión')) {
    return 'Tu sesión ya no es válida. Ingresa nuevamente.';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  }
  return 'No pudimos procesar la invitación. Intenta de nuevo.';
}
