-- Seed script to create the authorized pilot business "Chifa Wa Wau"
-- TV2-ROSTER-19: Create requested services, active/on-shift unlinked roster barber (Luis Perez)

BEGIN;

-- 1. Upsert Pilot Business (Empresa)
DO $$
DECLARE
  v_empresa_id uuid;
  v_fila_id uuid;
  v_barbero_id uuid;
  v_servicio_corte uuid;
  v_servicio_barba uuid;
  v_servicio_corte_barba uuid;
  v_servicio_infantil uuid;
BEGIN
  -- Insert or Get Empresa
  SELECT id INTO v_empresa_id FROM public.empresas WHERE codigo = 'CHIFAWAWAU';
  IF NOT FOUND THEN
    INSERT INTO public.empresas (codigo, nombre, zona_horaria, abierta)
    VALUES ('CHIFAWAWAU', 'Chifa Wa Wau', 'America/Lima', true)
    RETURNING id INTO v_empresa_id;
  ELSE
    UPDATE public.empresas SET abierta = true WHERE id = v_empresa_id;
  END IF;

  -- Insert or Get Fila
  SELECT id INTO v_fila_id FROM public.filas WHERE empresa_id = v_empresa_id LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.filas (empresa_id, prefijo, duracion_promedio_seg, puestos_activos)
    VALUES (v_empresa_id, 'CWW', 1800, 1)
    RETURNING id INTO v_fila_id;
  END IF;

  -- 2. Setup Services
  -- Corte de cabello 30 min (1800s)
  INSERT INTO public.servicios (empresa_id, nombre, descripcion, duracion_estimada_seg, precio_referencia_centavos, activo)
  VALUES (v_empresa_id, 'Corte de cabello', 'Corte clásico o moderno', 1800, 3500, true)
  ON CONFLICT (empresa_id, nombre) DO UPDATE SET duracion_estimada_seg = 1800, activo = true
  RETURNING id INTO v_servicio_corte;

  -- Barba 20 min (1200s)
  INSERT INTO public.servicios (empresa_id, nombre, descripcion, duracion_estimada_seg, precio_referencia_centavos, activo)
  VALUES (v_empresa_id, 'Barba', 'Perfilado y rebajado de barba', 1200, 2000, true)
  ON CONFLICT (empresa_id, nombre) DO UPDATE SET duracion_estimada_seg = 1200, activo = true
  RETURNING id INTO v_servicio_barba;

  -- Corte + barba 45 min (2700s)
  INSERT INTO public.servicios (empresa_id, nombre, descripcion, duracion_estimada_seg, precio_referencia_centavos, activo)
  VALUES (v_empresa_id, 'Corte + barba', 'Servicio completo', 2700, 5000, true)
  ON CONFLICT (empresa_id, nombre) DO UPDATE SET duracion_estimada_seg = 2700, activo = true
  RETURNING id INTO v_servicio_corte_barba;

  -- Corte infantil 30 min (1800s)
  INSERT INTO public.servicios (empresa_id, nombre, descripcion, duracion_estimada_seg, precio_referencia_centavos, activo)
  VALUES (v_empresa_id, 'Corte infantil', 'Corte para niños', 1800, 2500, true)
  ON CONFLICT (empresa_id, nombre) DO UPDATE SET duracion_estimada_seg = 1800, activo = true
  RETURNING id INTO v_servicio_infantil;

  -- 3. Setup Barber (Unlinked Roster Barber: Luis Perez)
  SELECT id INTO v_barbero_id FROM public.barberos WHERE empresa_id = v_empresa_id AND nombre = 'Luis Perez' LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.barberos (empresa_id, nombre, activo)
    VALUES (v_empresa_id, 'Luis Perez', true)
    RETURNING id INTO v_barbero_id;
  ELSE
    UPDATE public.barberos SET activo = true WHERE id = v_barbero_id;
  END IF;

  -- 4. Map Barber to Services (Compatible with all 4)
  INSERT INTO public.barbero_servicios (barbero_id, servicio_id) VALUES (v_barbero_id, v_servicio_corte) ON CONFLICT DO NOTHING;
  INSERT INTO public.barbero_servicios (barbero_id, servicio_id) VALUES (v_barbero_id, v_servicio_barba) ON CONFLICT DO NOTHING;
  INSERT INTO public.barbero_servicios (barbero_id, servicio_id) VALUES (v_barbero_id, v_servicio_corte_barba) ON CONFLICT DO NOTHING;
  INSERT INTO public.barbero_servicios (barbero_id, servicio_id) VALUES (v_barbero_id, v_servicio_infantil) ON CONFLICT DO NOTHING;

  -- 5. Set Barber Operational State (Active/On-Shift -> 'disponible')
  INSERT INTO public.barbero_operaciones (barbero_id, empresa_id, estado)
  VALUES (v_barbero_id, v_empresa_id, 'disponible')
  ON CONFLICT (barbero_id) DO UPDATE SET estado = 'disponible';

END $$;

COMMIT;
