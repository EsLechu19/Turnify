// Delivers the private called-ticket outbox. Deploy this function only after
// configuring SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and EXPO_ACCESS_TOKEN
// as server-side secrets. No caller supplies provider credentials or tokens.

type Delivery = {
  id: string;
  notificacion_id: string;
  dispositivo: { push_token: string } | null;
  notificacion: {
    ticket_id: string;
    ticket: { fila_id: string } | null;
  } | null;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
};

type ExpoPushResponse = {
  data: ExpoPushTicket[];
};

const requiredEnvironment = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EXPO_ACCESS_TOKEN'] as const;

function environment(): Record<(typeof requiredEnvironment)[number], string> {
  const values = Object.fromEntries(
    requiredEnvironment.map((name) => [name, Deno.env.get(name)?.trim() ?? '']),
  ) as Record<(typeof requiredEnvironment)[number], string>;

  if (requiredEnvironment.some((name) => !values[name])) {
    throw new Error('Server delivery environment is incomplete.');
  }
  return values;
}

function successfulProviderReceiptId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Push provider response is malformed.');
  }

  const response = payload as Partial<ExpoPushResponse>;
  const receipt = response.data?.[0];
  if (!Array.isArray(response.data) || !receipt || receipt.status !== 'ok') {
    throw new Error('Push provider did not accept delivery.');
  }

  return typeof receipt.id === 'string' ? receipt.id : null;
}

async function supabase(
  url: string,
  serviceKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
}

async function claimDelivery(url: string, serviceKey: string, deliveryId: string): Promise<Delivery | null> {
  const response = await supabase(
    url,
    serviceKey,
    `notificacion_entregas?id=eq.${encodeURIComponent(deliveryId)}&estado=eq.pendiente&select=id,notificacion_id,dispositivo:dispositivos(push_token),notificacion:notificaciones_salientes(ticket_id,ticket:tickets(fila_id))`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ estado: 'enviando', intentos: 1 }),
    },
  );
  if (!response.ok) throw new Error('Could not claim delivery.');
  const rows = (await response.json()) as Delivery[];
  return rows[0] ?? null;
}

async function finalizeNotification(url: string, serviceKey: string, notificationId: string): Promise<void> {
  const pending = await supabase(
    url,
    serviceKey,
    `notificacion_entregas?notificacion_id=eq.${encodeURIComponent(notificationId)}&estado=in.(pendiente,enviando,indeterminada)&select=id`,
  );
  if (!pending.ok) throw new Error('Could not inspect notification completion.');
  const rows = (await pending.json()) as Array<{ id: string }>;
  if (rows.length === 0) {
    await supabase(url, serviceKey, `notificaciones_salientes?id=eq.${encodeURIComponent(notificationId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'entregada', completado_en: new Date().toISOString() }),
    });
  }
}

Deno.serve(async (request) => {
  try {
    const env = environment();
    if (request.headers.get('authorization') !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const pending = await supabase(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      'notificacion_entregas?estado=eq.pendiente&select=id&order=creado_en.asc&limit=50',
    );
    if (!pending.ok) throw new Error('Could not list pending deliveries.');

    let delivered = 0;
    let indeterminate = 0;
    for (const pendingDelivery of (await pending.json()) as Array<{ id: string }>) {
      const delivery = await claimDelivery(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, pendingDelivery.id);
      if (!delivery) continue;

      // A delivery is claimed before its provider request. Any uncertain outcome
      // is never automatically retried, preferring no duplicate alert.
      try {
        if (!delivery.dispositivo?.push_token) throw new Error('Recipient device is unavailable.');
        if (!delivery.notificacion?.ticket || !delivery.notificacion.ticket_id) {
          throw new Error('Called-ticket routing metadata is unavailable.');
        }
        const provider = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            to: delivery.dispositivo.push_token,
            title: 'Turnify',
            body: 'Tu turno fue llamado.',
            data: {
              type: 'turnify.ticket-called',
              ticketId: delivery.notificacion.ticket_id,
              queueId: delivery.notificacion.ticket.fila_id,
            },
          }),
        });
        if (!provider.ok) throw new Error('Push provider rejected delivery.');

        const providerMessageId = successfulProviderReceiptId(await provider.json());
        await supabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, `notificacion_entregas?id=eq.${encodeURIComponent(delivery.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            estado: 'entregada',
            proveedor_mensaje_id: providerMessageId,
            enviado_en: new Date().toISOString(),
          }),
        });
        await finalizeNotification(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, delivery.notificacion_id);
        delivered += 1;
      } catch {
        await supabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, `notificacion_entregas?id=eq.${encodeURIComponent(delivery.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'indeterminada' }),
        });
        await supabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, `notificaciones_salientes?id=eq.${encodeURIComponent(delivery.notificacion_id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'indeterminada', completado_en: new Date().toISOString() }),
        });
        indeterminate += 1;
      }
    }

    // Counts only: never log provider tokens, request headers, or provider bodies.
    console.log(JSON.stringify({ event: 'called_ticket_delivery_batch', delivered, indeterminate }));
    return Response.json({ delivered, indeterminate });
  } catch {
    return new Response('Server delivery failed.', { status: 500 });
  }
});
