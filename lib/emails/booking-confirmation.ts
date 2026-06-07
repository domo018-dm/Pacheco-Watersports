interface BookingEmailData {
  reservationId:   string
  customerName:    string
  customerEmail:   string
  craftName:       string
  craftType:       string   // "Jet Ski" | "Boat" | "Pontoon"
  startTime:       string   // ISO
  endTime:         string   // ISO
  durationHours:   number
  amountCents:     number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(iso: string) {
  const h = new Date(iso).getHours()
  const ampm = h < 12 ? 'AM' : 'PM'
  const d = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${d}:00 ${ampm}`
}

function fmtAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function refCode(reservationId: string) {
  return reservationId.split('-')[0].toUpperCase()
}

// ── Row helper ────────────────────────────────────────────────────────────────

function row(label: string, value: string, highlight = false) {
  return `
    <tr>
      <td style="
        padding: 10px 0;
        border-bottom: 1px solid #1e2130;
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: #6b6760;
        width: 38%;
        vertical-align: top;
      ">${label}</td>
      <td style="
        padding: 10px 0 10px 16px;
        border-bottom: 1px solid #1e2130;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        color: ${highlight ? '#c8a84b' : '#e8e0d0'};
        font-weight: ${highlight ? '700' : '400'};
        ${highlight ? "letter-spacing: .14em; font-family: 'Courier New', Courier, monospace; font-size: 18px;" : ''}
        vertical-align: top;
      ">${value}</td>
    </tr>`
}

// ── HTML template ─────────────────────────────────────────────────────────────

export function buildBookingConfirmationEmail(data: BookingEmailData) {
  const {
    reservationId, customerName, craftName, craftType,
    startTime, endTime, durationHours, amountCents,
  } = data

  const firstName  = customerName.split(' ')[0] || 'there'
  const ref        = refCode(reservationId)
  const dateStr    = fmtDate(startTime)
  const timeBlock  = `${fmtTime(startTime)} – ${fmtTime(endTime)}`
  const durLabel   = `${durationHours} hr${durationHours !== 1 ? 's' : ''}`
  const amountStr  = fmtAmount(amountCents)

  const subject = `Booking confirmed — ${craftName} on ${new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="
  margin: 0; padding: 0;
  background-color: #0b0d12;
  font-family: Arial, Helvetica, sans-serif;
  -webkit-text-size-adjust: 100%;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0d12; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <p style="
                margin: 0;
                font-family: 'Arial Narrow', Arial, sans-serif;
                font-size: 13px;
                letter-spacing: .18em;
                text-transform: uppercase;
                color: #c8a84b;
                font-weight: 700;
              ">PACHECO WATERSPORTS</p>
              <p style="
                margin: 4px 0 0;
                font-size: 12px;
                color: #3d3f4d;
                letter-spacing: .06em;
              ">CONCHAS LAKE · NEW MEXICO</p>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="
              background-color: #13151e;
              border: 1px solid #1e2130;
              padding: 36px 36px 28px;
            ">

              <!-- Check + headline -->
              <p style="
                margin: 0 0 6px;
                font-size: 28px;
                color: #3a9e6c;
                line-height: 1;
              ">&#10003;</p>
              <h1 style="
                margin: 0 0 6px;
                font-family: 'Arial Narrow', Impact, sans-serif;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: .04em;
                text-transform: uppercase;
                color: #e8e0d0;
                line-height: 1.1;
              ">YOU'RE ON THE WATER,<br />${firstName.toUpperCase()}!</h1>
              <p style="
                margin: 0 0 28px;
                font-size: 14px;
                color: #6b6760;
                line-height: 1.5;
              ">
                Payment received. We'll call to confirm and meet you at the Conchas launch.
              </p>

              <!-- Booking details table -->
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Ref #', ref, true)}
                ${row('Craft', `${craftName} — ${craftType}`)}
                ${row('Date', dateStr)}
                ${row('Time', timeBlock)}
                ${row('Duration', durLabel)}
                ${row('Amount paid', amountStr)}
              </table>

              <!-- What's next -->
              <div style="
                margin-top: 28px;
                padding: 16px 20px;
                background-color: #0f1118;
                border-left: 3px solid #c8a84b;
              ">
                <p style="
                  margin: 0 0 4px;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 10px;
                  letter-spacing: .16em;
                  text-transform: uppercase;
                  color: #c8a84b;
                ">WHAT HAPPENS NEXT</p>
                <p style="
                  margin: 0;
                  font-size: 14px;
                  color: #a09890;
                  line-height: 1.6;
                ">
                  We'll give you a call before your reservation to confirm the details.
                  Bring a valid ID. Meet us at the <strong style="color: #e8e0d0;">Conchas Lake boat launch</strong>
                  15 minutes before your start time.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0;">
              <p style="
                margin: 0;
                font-size: 13px;
                color: #3d3f4d;
                line-height: 1.7;
              ">
                Questions? Call us at
                <a href="tel:+15055739275" style="color: #c8a84b; text-decoration: none;">(505) 573-9275</a>
                — we're at the lake.<br />
                <span style="font-size: 11px;">
                  Your ref number is <strong style="color: #6b6760;">${ref}</strong>.
                  Save this email as proof of booking.
                </span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `PACHECO WATERSPORTS — BOOKING CONFIRMED
Conchas Lake, New Mexico

You're on the water, ${firstName}!

Payment received. We'll call to confirm and meet you at the Conchas launch.

──────────────────────
BOOKING DETAILS
──────────────────────
Ref #:        ${ref}
Craft:        ${craftName} — ${craftType}
Date:         ${dateStr}
Time:         ${timeBlock}
Duration:     ${durLabel}
Amount paid:  ${amountStr}
──────────────────────

WHAT HAPPENS NEXT
We'll call before your reservation to confirm details. Bring a valid ID.
Meet us at the Conchas Lake boat launch 15 minutes before your start time.

Questions? Call (505) 573-9275 — we're at the lake.
Save this email. Your ref number is ${ref}.
`

  return { subject, html, text }
}
