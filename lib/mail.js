const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NOTIFY_EMAIL } = process.env;

// canSend: we can email customers (reset links, confirmations). enabled: we can also alert the sales inbox.
const canSend = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const enabled = canSend && Boolean(NOTIFY_EMAIL);
const transport = canSend
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT || 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 15000,
      socketTimeout: 20000,
    })
  : null;
const FROM = SMTP_FROM || SMTP_USER;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const refOf = (e) => 'PX-' + String(e.id).padStart(5, '0');
const itemLine = (i) => `${i.name} x ${i.qty}` + (i.size ? `, size ${i.size}` : '') + (i.where ? `, for ${i.where}` : '');

function detailRows(e) {
  return [
    ['Name', e.name], ['Phone', e.phone], ['Email', e.email || '-'], ['Company', e.company || '-'],
    ['Project', e.project_name || '-'], ['Location', e.city || '-'], ['Customer type', e.buyer_type || '-'],
    ['Need', e.need || '-'], ['Project stage', e.stage || '-'], ['Needed', e.timeline || '-'],
    ['Number of units', e.units || '-'], ['Glazing', e.glazing || '-'], ['Finish', e.finish || '-'],
    ['Contact by', [e.contact_pref, e.contact_time].filter(Boolean).join(', ') || '-'],
  ];
}

async function sendEnquiryMail(e) {
  if (!enabled) throw new Error('Email is not configured');
  const items = JSON.parse(e.items || '[]');
  const rows = detailRows(e);
  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`), '', 'Products:',
    ...(items.length ? items.map((i) => `- ${itemLine(i)}`) : ['- (none selected)']), '', `Notes: ${e.message || '-'}`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0d2036">
    <h2 style="margin:0 0 12px">New pricing request ${refOf(e)}</h2>
    <table cellpadding="5" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#9c7536;font-weight:bold;vertical-align:top">${k}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <p style="margin:14px 0 4px;font-weight:bold">Products</p>
    <ul style="margin:0">${items.length ? items.map((i) => `<li>${esc(itemLine(i))}</li>`).join('') : '<li>None selected</li>'}</ul>
    <p style="margin:14px 0 4px;font-weight:bold">Notes</p>
    <p style="margin:0;white-space:pre-wrap">${esc(e.message || '-')}</p></div>`;
  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email) ? e.email : undefined;
  await transport.sendMail({ from: FROM, to: NOTIFY_EMAIL, replyTo, subject: `New pricing request ${refOf(e)} from ${e.name}`, text, html });
}

async function sendConfirmation(e) {
  if (!canSend || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) return;
  const text = `Hello ${e.name},\n\nThank you for contacting PrimeX International. We have received your pricing request ${refOf(e)} and our team will get back to you with a detailed quotation.\n\nPrimeX International`;
  await transport.sendMail({
    from: FROM, to: e.email, subject: `We received your request ${refOf(e)}`, text,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0d2036"><p>Hello ${esc(e.name)},</p><p>Thank you for contacting <b>PrimeX International</b>. We have received your pricing request <b>${refOf(e)}</b> and our team will get back to you with a detailed quotation.</p></div>`,
  });
}

async function sendResetMail(user, link) {
  if (!canSend) throw new Error('Email is not configured');
  await transport.sendMail({
    from: FROM, to: user.email, subject: 'Reset your PrimeX password',
    text: `Hello ${user.name},\n\nUse this link within one hour to choose a new password:\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0d2036"><p>Hello ${esc(user.name)},</p><p><a href="${esc(link)}">Choose a new password</a> (valid for one hour).</p><p style="color:#52647a">If you did not ask for this, you can ignore this email.</p></div>`,
  });
}

module.exports = { enabled, canSend, sendEnquiryMail, sendConfirmation, sendResetMail, refOf };
