// GENERATED STUB - replace with real output once a live database exists.
// Generate the real file with: supabase gen types typescript --project-id <id>
// and overwrite this file. Do NOT invent credentials; this placeholder only
// mirrors the shape of supabase/migrations/0001_base_schema.sql and
// supabase/migrations/0002_queue_rpcs.sql so the app compiles offline.
// Table and column names stay in Spanish to match the database;
// every other identifier and comment in this file is in English.
// Row shapes use `type` (not `interface`) so they carry an implicit index
// signature, matching supabase-js codegen and its GenericSchema constraint.

export type RolUsuario = 'cliente' | 'admin' | 'personal';
export type OrigenTicket = 'app' | 'presencial';
export type PrioridadTicket = 'normal' | 'preferencial';
export type EstadoTicket =
  | 'en_espera'
  | 'notificado'
  | 'llamado'
  | 'en_atencion'
  | 'finalizado'
  | 'cancelado'
  | 'ausente';

export type EmpresaRow = {
  id: string;
  nombre: string;
  codigo: string;
  abierta: boolean;
  aviso_posiciones: number;
  minutos_gracia: number;
  preferencial_cada: number;
  zona_horaria: string;
  id_fiscal: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type PerfilRow = {
  id: string;
  rol: RolUsuario;
  empresa_id: string | null;
  nombre: string | null;
  telefono: string | null;
  creado_en: string;
};

export type InvitacionRow = {
  id: string;
  empresa_id: string;
  email: string;
  rol: RolUsuario;
  token: string;
  creada_por: string | null;
  aceptada: boolean;
  expira_en: string | null;
  creado_en: string;
};

export type DispositivoRow = {
  id: string;
  usuario_id: string;
  push_token: string;
  plataforma: string | null;
  creado_en: string;
};

export type FilaRow = {
  id: string;
  empresa_id: string;
  nombre: string;
  prefijo: string;
  puestos_activos: number;
  duracion_promedio_seg: number;
  en_espera: number;
  ultimo_llamado: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type TicketRow = {
  id: string;
  empresa_id: string;
  fila_id: string;
  cliente_id: string | null;
  atendido_por: string | null;
  origen: OrigenTicket;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  fecha_operativa: string;
  numero: number;
  codigo_visible: string;
  nombre_ref: string | null;
  creado_en: string;
  actualizado_en: string;
  notificado_en: string | null;
  llamado_en: string | null;
  inicio_en: string | null;
  fin_en: string | null;
  cerrado_en: string | null;
};

// Minimal Database shape in the supabase-js codegen style, covering the
// tables, enums and RPC names used by the data adapter. Regenerate with
// `supabase gen types` once the live project exists; keep names in sync
// with migrations 0001 and 0002 until then.
export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: EmpresaRow;
        Insert: Partial<EmpresaRow>;
        Update: Partial<EmpresaRow>;
        Relationships: [];
      };
      perfiles: {
        Row: PerfilRow;
        Insert: Partial<PerfilRow>;
        Update: Partial<PerfilRow>;
        Relationships: [];
      };
      invitaciones: {
        Row: InvitacionRow;
        Insert: Partial<InvitacionRow>;
        Update: Partial<InvitacionRow>;
        Relationships: [];
      };
      dispositivos: {
        Row: DispositivoRow;
        Insert: Partial<DispositivoRow>;
        Update: Partial<DispositivoRow>;
        Relationships: [];
      };
      filas: {
        Row: FilaRow;
        Insert: Partial<FilaRow>;
        Update: Partial<FilaRow>;
        Relationships: [];
      };
      tickets: {
        Row: TicketRow;
        Insert: Partial<TicketRow>;
        Update: Partial<TicketRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Enums: {
      rol_usuario: RolUsuario;
      origen_ticket: OrigenTicket;
      prioridad_ticket: PrioridadTicket;
      estado_ticket: EstadoTicket;
    };
    Functions: {
      tomar_turno: {
        Args: { p_codigo: string; p_fila_id?: string | null };
        Returns: TicketRow;
      };
      resumen_empresa: { Args: { p_codigo: string }; Returns: unknown };
      mi_ticket_estado: { Args: { p_ticket_id: string }; Returns: unknown };
      cancelar_ticket: { Args: { p_ticket_id: string }; Returns: TicketRow };
      crear_empresa: {
        Args: {
          p_nombre: string;
          p_id_fiscal?: string | null;
          p_correo?: string | null;
          p_telefono?: string | null;
          p_direccion?: string | null;
        };
        Returns: EmpresaRow;
      };
      crear_invitacion: {
        Args: { p_email: string; p_rol?: RolUsuario };
        Returns: InvitacionRow;
      };
      aceptar_invitacion: { Args: { p_token: string }; Returns: string };
      crear_ticket_presencial: {
        Args: {
          p_fila_id: string;
          p_prioridad?: PrioridadTicket;
          p_nombre_ref?: string | null;
        };
        Returns: TicketRow;
      };
      llamar_siguiente: {
        Args: { p_fila_id: string };
        Returns: TicketRow | null;
      };
      iniciar_atencion: { Args: { p_ticket_id: string }; Returns: TicketRow };
      finalizar_atencion: { Args: { p_ticket_id: string }; Returns: TicketRow };
      marcar_ausente: { Args: { p_ticket_id: string }; Returns: TicketRow };
      metricas_resumen: { Args: { p_empresa_id: string }; Returns: unknown };
      metricas_horas_pico: { Args: { p_empresa_id: string }; Returns: unknown };
    };
  };
};
