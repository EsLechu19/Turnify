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
