import nodemailer from 'nodemailer';

type Item = { name: string; quantity: number; unitPrice: number };

type BaseInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  paymentMethod: 'RAZORPAY' | 'CASH';
  fulfillmentType: string;
  items: Item[];
};

function transporterOrNull() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) return null;
  return { transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
}

function safe(value: string) {
  return value.replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

function orderCode(id: string) { return id.slice(-6).toUpperCase(); }
function handoverLabel(type: string) { return type === 'VEHICLE' ? 'Vehicle curbside' : 'Corporate / office delivery'; }

export async function sendOrderReceipt(input: BaseInput) {
  const mail = transporterOrNull();
  if (!mail || !input.customerEmail) {
    console.warn('Order receipt email skipped: SMTP credentials or customer email are not configured.');
    return false;
  }
  const rows = input.items.map(i => `<tr><td style="padding:10px 0;border-bottom:1px solid #3a302a">${i.quantity}× ${safe(i.name)}</td><td style="padding:10px 0;border-bottom:1px solid #3a302a;text-align:right">₹${i.unitPrice * i.quantity}</td></tr>`).join('');
  const payment = input.paymentMethod === 'CASH' ? 'Cash — due at handover' : 'Paid securely with Razorpay';
  await mail.transporter.sendMail({
    from: mail.from,
    to: input.customerEmail,
    subject: `Your Oat & Ember receipt · #${orderCode(input.orderId)}`,
    html: `<!doctype html><html><body style="margin:0;background:#12100E;color:#F5EBE6;font-family:Arial,sans-serif;padding:32px"><div style="max-width:620px;margin:auto;background:#211C18;border:1px solid #3a302a;border-radius:24px;padding:32px"><p style="letter-spacing:3px;text-transform:uppercase;color:#4E6E58;font-size:12px;font-weight:bold">OAT & EMBER</p><h1 style="font-size:36px;margin:8px 0 4px">Order locked in.</h1><p style="color:#b9aaa3">Hey ${safe(input.customerName)}, here is your receipt for order #${orderCode(input.orderId)}.</p><table style="width:100%;border-collapse:collapse;margin-top:24px">${rows}<tr><td style="padding-top:16px;font-weight:bold">Total</td><td style="padding-top:16px;text-align:right;font-weight:bold;color:#E05A47">₹${input.total}</td></tr></table><p style="margin-top:24px;color:#b9aaa3"><strong style="color:#F5EBE6">Handover:</strong> ${handoverLabel(input.fulfillmentType)}<br/><strong style="color:#F5EBE6">Payment:</strong> ${payment}</p><p style="margin-top:28px;color:#b9aaa3">Keep your phone nearby. We’ll call you when your order is ready.</p></div></body></html>`
  });
  return true;
}

export async function sendCustomerStatusEmail(input: { orderId: string; customerName: string; customerEmail: string; status: 'BREWING' | 'PACKED' | 'COMPLETED'; fulfillmentType: string; total: number }) {
  const mail = transporterOrNull();
  if (!mail || !input.customerEmail) {
    console.warn(`Customer status email skipped: SMTP credentials or customer email are not configured (${input.status}).`);
    return false;
  }
  const content = {
    BREWING: { subject: 'Your coffee is being brewed ☕', title: 'Your order is brewing.', body: 'Our barista has started preparing your order. You are officially on the good part of the day.' },
    PACKED: { subject: 'Your Oat & Ember order is packed 📦', title: 'Packed and waiting.', body: 'Your order is packed and ready for the final handover step.' },
    COMPLETED: { subject: 'Your Oat & Ember order is ready ☕', title: 'Your order is ready.', body: input.fulfillmentType === 'VEHICLE' ? 'Pull into your pickup spot, stay in your vehicle and we’ll bring the order to your window.' : 'Your order is ready for the office handover. Keep your phone nearby in case our team calls.' }
  }[input.status];
  await mail.transporter.sendMail({
    from: mail.from,
    to: input.customerEmail,
    subject: `${content.subject} · #${orderCode(input.orderId)}`,
    html: `<!doctype html><html><body style="margin:0;background:#12100E;color:#F5EBE6;font-family:Arial,sans-serif;padding:32px"><div style="max-width:620px;margin:auto;background:#211C18;border:1px solid #3a302a;border-radius:24px;padding:32px"><p style="letter-spacing:3px;text-transform:uppercase;color:#4E6E58;font-size:12px;font-weight:bold">OAT & EMBER · ORDER #${orderCode(input.orderId)}</p><h1 style="font-size:36px;line-height:1.05;margin:12px 0">${content.title}</h1><p style="font-size:16px;line-height:1.7;color:#b9aaa3">Hey ${safe(input.customerName)}, ${content.body}</p><div style="margin-top:24px;padding:18px;border-radius:16px;background:#2b241f"><strong style="color:#F5EBE6">Handover:</strong> ${handoverLabel(input.fulfillmentType)}<br/><strong style="color:#F5EBE6">Order total:</strong> ₹${input.total}</div><p style="margin-top:28px;color:#b9aaa3">We’ll keep you posted as the order moves through the café.</p></div></body></html>`
  });
  return true;
}

export async function sendOwnerNewOrder(input: BaseInput & { fulfillmentData?: string }) {
  const mail = transporterOrNull();
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
  if (!mail || !to) {
    console.warn('Owner new-order email skipped: SMTP credentials or ADMIN_NOTIFICATION_EMAIL are not configured.');
    return false;
  }
  const rows = input.items.map(i => `<tr><td style="padding:8px 0">${i.quantity}× ${safe(i.name)}</td><td style="padding:8px 0;text-align:right">₹${i.unitPrice * i.quantity}</td></tr>`).join('');
  let handover = handoverLabel(input.fulfillmentType);
  if (input.fulfillmentData) {
    try {
      const fd = JSON.parse(input.fulfillmentData);
      handover += `<br/><span style="color:#b9aaa3">${safe(Object.entries(fd).filter(([k]) => k !== 'type').map(([k,v]) => `${k}: ${String(v)}`).join(' · '))}</span>`;
    } catch {}
  }
  await mail.transporter.sendMail({
    from: mail.from,
    to,
    subject: `🔔 NEW ORDER #${orderCode(input.orderId)} · ₹${input.total}`,
    html: `<!doctype html><html><body style="margin:0;background:#12100E;color:#F5EBE6;font-family:Arial,sans-serif;padding:32px"><div style="max-width:620px;margin:auto;background:#211C18;border:1px solid #3a302a;border-radius:24px;padding:32px"><p style="letter-spacing:3px;text-transform:uppercase;color:#E05A47;font-size:12px;font-weight:bold">NEW ORDER · OAT & EMBER</p><h1 style="font-size:36px;margin:8px 0">#${orderCode(input.orderId)}</h1><p style="color:#b9aaa3">${safe(input.customerName)} · <a style="color:#F5EBE6" href="tel:+91${input.customerPhone}">${safe(input.customerPhone)}</a> · ${safe(input.customerEmail)}</p><table style="width:100%;border-collapse:collapse;margin-top:24px">${rows}<tr><td style="padding-top:16px;font-weight:bold">Total</td><td style="padding-top:16px;text-align:right;font-weight:bold;color:#E05A47">₹${input.total}</td></tr></table><p style="margin-top:24px;line-height:1.7"><strong>Handover:</strong><br/>${handover}<br/><strong>Payment:</strong> ${input.paymentMethod === 'CASH' ? 'CASH DUE' : 'RAZORPAY PAID'}</p><p style="margin-top:28px;color:#b9aaa3">Open the admin control room to start preparing the ticket.</p></div></body></html>`
  });
  return true;
}
