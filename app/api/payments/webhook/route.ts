import { E, equal, hmacBase64 } from "../../../shop-data";
import { paymentSession, settle, verifyCashfreeOrder } from "../../../payments";

function orderIdFromEvent(event: any) {
  return (
    event?.data?.order?.order_id ||
    event?.data?.payment?.order_id ||
    event?.order_id ||
    ""
  );
}

export async function POST(req: Request) {
  const secret = E().CASHFREE_CLIENT_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  if (raw.length > 200000) return new Response("Too large", { status: 413 });

  const signature = req.headers.get("x-webhook-signature") || "";
  const timestamp = req.headers.get("x-webhook-timestamp") || "";
  const expected = await hmacBase64(timestamp + raw, secret);

  if (!signature || !timestamp || !equal(signature, expected)) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const event = JSON.parse(raw);
    const orderId = orderIdFromEvent(event);
    if (!orderId) return Response.json({ ok: true });

    const session = await paymentSession(orderId);
    if (!session) return new Response("Order not yet available", { status: 503 });

    const snapshot = JSON.parse(session.data);
    const payment = await verifyCashfreeOrder(orderId, snapshot.mode);
    await settle(session, payment);
    return Response.json({ ok: true });
  } catch {
    return new Response("Unable to process event; retry required", { status: 503 });
  }
}
