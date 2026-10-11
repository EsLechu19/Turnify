import * as ImagePicker from 'expo-image-picker';

import { getSupabase } from '@/lib/supabase';

/** Minimal base64 decoder (no text dependency): cameras return base64 payloads. */
function base64ToBytes(base64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = clean[i + 2] === '=' ? 0 : alphabet.indexOf(clean[i + 2]);
    const d = clean[i + 3] === '=' ? 0 : alphabet.indexOf(clean[i + 3]);
    const triple = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((triple >> 16) & 255);
    if (clean[i + 2] !== '=') bytes.push((triple >> 8) & 255);
    if (clean[i + 3] !== '=') bytes.push(triple & 255);
  }

  return new Uint8Array(bytes);
}

export async function pickWorkerAvatar(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Necesitamos acceso a tus fotos para cambiar tu imagen.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].base64 ?? null;
}

/** Uploads the picked photo to the worker's global slot and records it. */
export async function uploadWorkerAvatar(base64: string): Promise<string> {
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (authError || !userIdOk(userId)) {
    throw new Error('No hay sesión activa.');
  }

  const id = userId as string;
  const { error: uploadError } = await supabase.storage
    .from('avatares-barberos')
    .upload(`${id}/avatar.jpg`, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('avatares-barberos').getPublicUrl(`${id}/avatar.jpg`);
  const { error: saveError } = await supabase.rpc('actualizar_mi_foto_barbero', { p_foto_url: data.publicUrl });

  if (saveError) throw new Error(saveError.message);
  return data.publicUrl;
}

function userIdOk(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export async function getMyWorkerAvatar(): Promise<string | null> {
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (authError || !userIdOk(userId)) return null;

  const { data, error } = await supabase.from('perfiles').select('foto_url').eq('id', userId).maybeSingle();

  if (error || !data) return null;
  return (data as { foto_url: string | null }).foto_url;
}
