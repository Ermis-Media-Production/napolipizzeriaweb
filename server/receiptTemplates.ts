/**
 * Receipt HTML templates for Napoli Pizzeria
 * Used for email receipts sent to admin (info@napolipizzeria.net) and customers.
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface ReceiptData {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  orderType: string;
  items: ReceiptItem[];
  subtotal: number;
  convenienceFee: number;
  salesTax: number;
  deliveryFee?: number;
  discount?: number;
  couponCode?: string;
  discountPercent?: number;
  grandTotal: number;
  transactionId: string;
  authCode?: string;
  date: string;
}

const COMPANY_INFO = {
  name: "NAPOLI PIZZERIA",
  address: "3420 W Craig Rd, North Las Vegas, NV 89032",
  phone: "(702) 544-8930",
  website: "napolipizzerianorthlasvegas.com",
};

const ORDER_TYPE_CONFIG: Record<string, { icon: string; label: string; badgeClass: string }> = {
  pickup: { icon: "🥡", label: "Pickup", badgeClass: "badge-pickup" },
  delivery: { icon: "🚗", label: "Delivery", badgeClass: "badge-delivery" },
  "dine-in": { icon: "🍽️", label: "Dine-In", badgeClass: "badge-dinein" },
  scheduled: { icon: "📅", label: "Scheduled", badgeClass: "badge-pickup" },
};

function getOrderType(type: string) {
  const key = type.toLowerCase().replace(/\s+/g, "-");
  return ORDER_TYPE_CONFIG[key] ?? { icon: "📋", label: type, badgeClass: "badge-pickup" };
}

function renderItemsHtml(items: ReceiptItem[]): string {
  return items
    .map((item) => {
      // Split on " · " (frontend format), newlines, or semicolons — each modifier gets its own line
      const modLines = item.description
        ? item.description
            .split(/ · |\n|;/)
            .map((m) => m.trim())
            .filter(Boolean)
        : [];
      const modHtml = modLines
        .map((m) => `<div class="mod-line">▸ ${m}</div>`)
        .join("");
      return `
        <div class="item-row">
          <div class="item-left">
            <div class="item-name"><span class="item-qty">${item.quantity}×</span>${item.name}</div>
            ${modHtml ? `<div class="item-modifiers">${modHtml}</div>` : ""}
          </div>
          <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>`;
    })
    .join("");
}

function renderTotalsHtml(data: ReceiptData): string {
  const rows: string[] = [];
  rows.push(`<tr><td class="label">Subtotal</td><td class="amount">$${data.subtotal.toFixed(2)}</td></tr>`);
  if (data.discount && data.discount > 0) {
    rows.push(`<tr class="discount"><td class="label">Coupon${data.couponCode ? ` (${data.couponCode}${data.discountPercent ? ` — ${data.discountPercent}% off` : ""})` : ""}</td><td class="amount">−$${data.discount.toFixed(2)}</td></tr>`);
  }
  if (data.deliveryFee && data.deliveryFee > 0) {
    rows.push(`<tr><td class="label">Delivery Fee</td><td class="amount">$${data.deliveryFee.toFixed(2)}</td></tr>`);
  }
  rows.push(`<tr><td class="label">Convenience Fee (3%)</td><td class="amount">$${data.convenienceFee.toFixed(2)}</td></tr>`);
  rows.push(`<tr><td class="label">Nevada Sales Tax (8.375%)</td><td class="amount">$${data.salesTax.toFixed(2)}</td></tr>`);
  rows.push(`<tr class="divider"><td colspan="2"></td></tr>`);
  rows.push(`<tr class="grand"><td class="label">Total Charged</td><td class="amount">$${data.grandTotal.toFixed(2)}</td></tr>`);
  return rows.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER RECEIPT (green/cream, friendly)
// ─────────────────────────────────────────────────────────────────────────────
export function buildCustomerReceiptHtml(data: ReceiptData): string {
  const orderType = getOrderType(data.orderType);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Order Confirmation — Napoli Pizzeria</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#f5f0e8;color:#2c1a0e;padding:24px 12px;}
  .receipt{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8d5b0;}
  .header{background:#1a3c1a;padding:28px 28px 20px;text-align:center;}
  .header .logo{font-size:26px;color:#d4a843;font-weight:700;letter-spacing:2px;margin-bottom:4px;}
  .header .tagline{font-size:11px;color:#a8c5a0;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;}
  .header .contacts{font-size:11px;color:#c8dfc8;line-height:1.8;}
  .confirm-banner{background:#e8f5e9;border-bottom:3px solid #2e7d32;padding:18px 28px;text-align:center;}
  .confirm-banner .check{font-size:32px;margin-bottom:4px;}
  .confirm-banner h2{font-size:18px;color:#1b5e20;font-weight:700;margin-bottom:3px;}
  .confirm-banner p{font-size:12px;color:#388e3c;}
  .section{padding:20px 28px;border-bottom:1px solid #f0e8d8;}
  .section:last-child{border-bottom:none;}
  .section-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8b5e3c;margin-bottom:12px;}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .meta-item label{display:block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9e7b5a;margin-bottom:1px;}
  .meta-item span{font-size:13px;font-weight:600;color:#2c1a0e;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;}
  .badge-pickup{background:#fff3e0;color:#e65100;}
  .badge-delivery{background:#e3f2fd;color:#1565c0;}
  .badge-dinein{background:#f3e5f5;color:#6a1b9a;}
  .item-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px dashed #f0e8d8;}
  .item-row:last-child{border-bottom:none;}
  .item-left{flex:1;}
  .item-name{font-size:13px;font-weight:700;color:#2c1a0e;margin-bottom:3px;}
  .item-qty{display:inline-block;background:#1a3c1a;color:#d4a843;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;margin-right:5px;}
  .item-modifiers{font-size:11px;color:#7a5c3a;margin-top:3px;}
  .mod-line{display:block;font-size:11px;color:#7a5c3a;padding:1px 0;line-height:1.5;}
  .item-price{font-size:13px;font-weight:700;color:#2c1a0e;white-space:nowrap;padding-left:12px;}
  .totals-table{width:100%;}
  .totals-table tr td{padding:4px 0;font-size:12px;}
  .totals-table .label{color:#7a5c3a;}
  .totals-table .amount{text-align:right;font-weight:600;color:#2c1a0e;}
  .totals-table .divider td{border-top:1px solid #e8d5b0;padding-top:8px;}
  .totals-table .grand td{font-size:16px;font-weight:700;color:#1a3c1a;padding-top:6px;}
  .totals-table .discount .amount{color:#2e7d32;}
  .footer{background:#1a3c1a;padding:18px 28px;text-align:center;}
  .footer .thank-you{font-size:15px;color:#d4a843;font-weight:700;margin-bottom:6px;}
  .footer p{font-size:11px;color:#a8c5a0;line-height:1.7;}
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="logo">🍕 ${COMPANY_INFO.name}</div>
    <div class="tagline">Authentic Italian · North Las Vegas</div>
    <div class="contacts">
      📍 ${COMPANY_INFO.address}<br/>
      📞 ${COMPANY_INFO.phone} · 🌐 ${COMPANY_INFO.website}
    </div>
  </div>
  <div class="confirm-banner">
    <div class="check">✅</div>
    <h2>Order Confirmed!</h2>
    <p>Thank you for your order. We're preparing it now.</p>
  </div>
  <div class="section">
    <div class="section-title">Order Details</div>
    <div class="meta-grid">
      <div class="meta-item"><label>Order Type</label><span><span class="badge ${orderType.badgeClass}">${orderType.icon} ${orderType.label}</span></span></div>
      <div class="meta-item"><label>Date &amp; Time</label><span>${data.date}</span></div>
      <div class="meta-item"><label>Customer</label><span>${data.customerName}</span></div>
      ${data.customerPhone ? `<div class="meta-item"><label>Phone</label><span>${data.customerPhone}</span></div>` : ""}
      <div class="meta-item"><label>Transaction ID</label><span style="font-size:11px;font-family:monospace;">${data.transactionId}</span></div>
      ${data.authCode ? `<div class="meta-item"><label>Auth Code</label><span style="font-size:11px;font-family:monospace;">${data.authCode}</span></div>` : ""}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Items Ordered</div>
    ${renderItemsHtml(data.items)}
  </div>
  <div class="section">
    <div class="section-title">Order Summary</div>
    <table class="totals-table">
      ${renderTotalsHtml(data)}
    </table>
  </div>
  <div class="footer">
    <div class="thank-you">Grazie! Thank you for choosing Napoli Pizzeria 🍕</div>
    <p>
      Questions about your order? Call us at <strong style="color:#d4a843;">${COMPANY_INFO.phone}</strong><br/>
      ${COMPANY_INFO.address}<br/>
      Hours: Mon–Sun 10:00 AM – 10:00 PM
    </p>
  </div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN RECEIPT (dark theme, operational)
// ─────────────────────────────────────────────────────────────────────────────
export function buildAdminReceiptHtml(data: ReceiptData): string {
  const orderType = getOrderType(data.orderType);
  const totalUnits = data.items.reduce((s, i) => s + i.quantity, 0);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>New Order — Napoli Pizzeria Admin</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#1a1a1a;color:#f0f0f0;padding:24px 12px;}
  .receipt{max-width:600px;margin:0 auto;background:#242424;border-radius:12px;overflow:hidden;border:1px solid #333;}
  .header{background:linear-gradient(135deg,#8b1a1a 0%,#c0392b 100%);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;}
  .header-left .logo{font-size:20px;color:#fff;font-weight:700;letter-spacing:1px;}
  .header-left .sub{font-size:10px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;margin-top:2px;}
  .header-right{text-align:right;}
  .new-order-badge{background:#fff;color:#c0392b;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-bottom:4px;display:inline-block;}
  .header-right .timestamp{font-size:11px;color:rgba(255,255,255,0.8);}
  .alert-bar{background:#d4a843;padding:9px 28px;display:flex;align-items:center;gap:8px;}
  .alert-bar .text{font-size:12px;font-weight:700;color:#1a0e00;}
  .section{padding:18px 28px;border-bottom:1px solid #333;}
  .section:last-child{border-bottom:none;}
  .section-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d4a843;margin-bottom:12px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .info-item label{display:block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;margin-bottom:1px;}
  .info-item span{font-size:13px;font-weight:600;color:#f0f0f0;}
  .order-type-banner{display:flex;align-items:center;gap:10px;background:#2e2e2e;border-radius:8px;padding:10px 14px;border-left:4px solid #d4a843;}
  .order-type-icon{font-size:24px;}
  .type-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;}
  .type-value{font-size:16px;font-weight:700;color:#d4a843;}
  .item-row{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px dashed #333;}
  .item-row:last-child{border-bottom:none;}
  .item-left{flex:1;}
  .item-header{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
  .item-qty{background:#d4a843;color:#1a0e00;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;min-width:26px;text-align:center;}
  .item-name{font-size:14px;font-weight:700;color:#f0f0f0;}
  .item-modifiers{margin-left:33px;display:block;}
  .mod-line{display:block;font-size:11px;color:#bbb;padding:1px 0;line-height:1.5;}
  .item-price{font-size:14px;font-weight:700;color:#f0f0f0;white-space:nowrap;padding-left:12px;}
  .totals-table{width:100%;}
  .totals-table tr td{padding:4px 0;font-size:12px;}
  .totals-table .label{color:#aaa;}
  .totals-table .amount{text-align:right;font-weight:600;color:#f0f0f0;}
  .totals-table .divider td{border-top:1px solid #444;padding-top:8px;}
  .totals-table .grand td{font-size:17px;font-weight:700;color:#d4a843;padding-top:6px;}
  .totals-table .discount .amount{color:#66bb6a;}
  .txn-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;}
  .txn-label{color:#888;}
  .txn-value{font-family:monospace;color:#a8c5a0;font-weight:600;}
  .footer{background:#1a1a1a;padding:14px 28px;text-align:center;}
  .footer p{font-size:10px;color:#555;line-height:1.7;}
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="header-left">
      <div class="logo">🍕 ${COMPANY_INFO.name}</div>
      <div class="sub">Admin — New Order Notification</div>
    </div>
    <div class="header-right">
      <div class="new-order-badge">🔔 NEW ORDER</div>
      <div class="timestamp">${data.date}</div>
    </div>
  </div>
  <div class="alert-bar">
    <span>⚡</span>
    <span class="text">New paid order received — action required</span>
  </div>
  <div class="section">
    <div class="section-title">Order Type</div>
    <div class="order-type-banner">
      <div class="order-type-icon">${orderType.icon}</div>
      <div>
        <div class="type-label">Service</div>
        <div class="type-value">${orderType.label}</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="info-grid">
      <div class="info-item"><label>Name</label><span>${data.customerName}</span></div>
      ${data.customerPhone ? `<div class="info-item"><label>Phone</label><span>${data.customerPhone}</span></div>` : ""}
      ${data.customerEmail ? `<div class="info-item"><label>Email</label><span>${data.customerEmail}</span></div>` : ""}
      <div class="info-item"><label>Date / Time</label><span>${data.date}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Items — ${data.items.length} items · ${totalUnits} units</div>
    ${data.items.map((item) => {
      const modLines = item.description
        ? item.description
            .split(/ · |\n|;/)
            .map((m) => m.trim())
            .filter(Boolean)
        : [];
      const modHtml = modLines
        .map((m) => `<div class="mod-line">▸ ${m}</div>`)
        .join("");
      return `
        <div class="item-row">
          <div class="item-left">
            <div class="item-header">
              <span class="item-qty">${item.quantity}×</span>
              <span class="item-name">${item.name}</span>
            </div>
            ${modHtml ? `<div class="item-modifiers">${modHtml}</div>` : ""}
          </div>
          <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>`;
    }).join("")}
  </div>
  <div class="section">
    <div class="section-title">Payment Summary</div>
    <table class="totals-table">
      ${renderTotalsHtml(data)}
    </table>
  </div>
  <div class="section">
    <div class="section-title">Transaction Details</div>
    <div class="txn-row"><span class="txn-label">Transaction ID</span><span class="txn-value">${data.transactionId}</span></div>
    ${data.authCode ? `<div class="txn-row"><span class="txn-label">Auth Code</span><span class="txn-value">${data.authCode}</span></div>` : ""}
    <div class="txn-row"><span class="txn-label">Payment Method</span><span class="txn-value">Authorize.net · Card</span></div>
    <div class="txn-row"><span class="txn-label">Status</span><span class="txn-value" style="color:#66bb6a;">✅ APPROVED</span></div>
  </div>
  <div class="footer">
    <p>
      ${COMPANY_INFO.name} · ${COMPANY_INFO.address}<br/>
      ${COMPANY_INFO.phone} · ${COMPANY_INFO.website}<br/>
      This is an automated notification. Do not reply to this email.
    </p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Helper to send an HTML email via the Forge API.
 * Returns true on success, false on failure (fire-and-forget safe).
 */
export async function sendReceiptEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
  const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!forgeBaseUrl || !forgeKey) return false;
  try {
    const resp = await fetch(`${forgeBaseUrl}/v1/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgeKey}`,
      },
      body: JSON.stringify({ to: opts.to, subject: opts.subject, html: opts.html }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
