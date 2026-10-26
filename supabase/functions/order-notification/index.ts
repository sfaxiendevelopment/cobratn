/**
 * Order notification.
 *
 * Called by the storefront right after an order is placed. It is deliberately
 * given only an order id: the order, its items, the customer's name/phone and
 * the store's contact address are all re-read from the database here, so a
 * caller cannot forge the recipient or the body.
 *
 * Deploy:
 *   supabase functions deploy order-notification --no-verify-jwt
 *
 * Transport priority is EmailJS, then Resend, then Gmail SMTP:
 *   EmailJS:
 *     EMAILJS_SERVICE_ID
 *     EMAILJS_TEMPLATE_ID
 *     EMAILJS_PUBLIC_KEY
 *     EMAILJS_PRIVATE_KEY
 *   Resend:
 *     RESEND_API_KEY   Resend API key
 *     ORDER_FROM       verified sender, e.g. "COBRA TN <orders@yourdomain.tn>"
 *   Gmail / any SMTP account (no domain needed):
 *     SMTP_USER        default cobratn0@gmail.com
 *     SMTP_PASS        Gmail App Password (16 chars, no spaces)
 * Optional (both transports):
 *   ORDER_TO           comma-separated recipients; overrides admin_settings.contact_email
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

/** The store's own address. Used when neither ORDER_TO nor the settings row is set. */
const STORE_ADMIN_EMAIL = 'cobratn0@gmail.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const money = (value: unknown) => `${Number(value ?? 0).toFixed(2)} TND`

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const pdfText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')

async function createOrderPdf(order: Record<string, unknown>, items: Record<string, unknown>[]) {
  const { PDFDocument, StandardFonts, rgb } = await import('npm:pdf-lib@1.17.1')
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [595.28, 841.89]
  const margin = 46
  const maxWidth = pageSize[0] - margin * 2
  let page = pdf.addPage(pageSize)
  let cursor = 52

  const addPageIfNeeded = (height: number) => {
    if (cursor + height > pageSize[1] - margin) {
      page = pdf.addPage(pageSize)
      cursor = 52
    }
  }

  const line = (value: unknown, options: { size?: number; strong?: boolean; gap?: number } = {}) => {
    const size = options.size ?? 10
    const font = options.strong ? bold : regular
    const words = pdfText(value).split(/\s+/)
    let current = ''
    const wrapped: string[] = []

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        wrapped.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) wrapped.push(current)

    for (const text of wrapped) {
      addPageIfNeeded(size + 6)
      page.drawText(text, {
        x: margin,
        y: pageSize[1] - cursor - size,
        size,
        font,
        color: rgb(0.08, 0.08, 0.08),
      })
      cursor += size + 6
    }
    cursor += options.gap ?? 0
  }

  const divider = () => {
    addPageIfNeeded(12)
    page.drawLine({
      start: { x: margin, y: pageSize[1] - cursor },
      end: { x: pageSize[0] - margin, y: pageSize[1] - cursor },
      thickness: 0.8,
      color: rgb(0.75, 0.75, 0.75),
    })
    cursor += 12
  }

  line('COBRA TN', { size: 11, strong: true })
  line('ORDER DETAILS', { size: 22, strong: true, gap: 4 })
  line(`Order #${order.order_number}`)
  line(`Date: ${new Date(String(order.created_at)).toUTCString()}`)
  cursor += 6
  divider()
  line('ITEMS', { size: 13, strong: true, gap: 4 })
  for (const item of items) {
    line(`${item.product_name} | ${[item.color, item.size].filter(Boolean).join(' / ') || 'One size'}`, {
      strong: true,
    })
    line(`Quantity: ${item.quantity} | Unit price: ${money(item.unit_price)} | Line total: ${money(item.total_price)}`, {
      gap: 4,
    })
  }
  divider()
  line(`Subtotal: ${money(order.subtotal)}`)
  if (Number(order.discount) > 0) line(`Discount: ${money(order.discount)}`)
  line(`Shipping: ${money(order.shipping_cost)}`)
  line('Tax: 0.00 TND')
  line(`TOTAL: ${money(order.total)}`, { size: 13, strong: true, gap: 4 })
  divider()
  line('CUSTOMER AND DELIVERY', { size: 13, strong: true, gap: 4 })
  line(`Name: ${order.customer_name}`)
  line(`Email: ${order.customer_email}`)
  line(`Phone: ${order.phone}`)
  line(`Address: ${order.address}, ${order.city}, ${order.governorate}`)
  if (order.additional_info) line(`Additional info: ${order.additional_info}`)

  return pdf.save()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

    const emailJsServiceId = Deno.env.get('EMAILJS_SERVICE_ID')
    const emailJsTemplateId = Deno.env.get('EMAILJS_TEMPLATE_ID')
    const emailJsPublicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
    const emailJsPrivateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')
    const hasAnyEmailJsSetting = Boolean(
      emailJsServiceId || emailJsTemplateId || emailJsPublicKey || emailJsPrivateKey,
    )
    const hasEmailJs = Boolean(
      emailJsServiceId && emailJsTemplateId && emailJsPublicKey && emailJsPrivateKey,
    )
    const hasResend = Boolean(Deno.env.get('RESEND_API_KEY'))
    const hasSmtp = Boolean(Deno.env.get('SMTP_PASS'))
    if (hasAnyEmailJsSetting && !hasEmailJs) {
      return json(
        {
          sent: false,
          error:
            'EmailJS est sélectionné mais sa configuration est incomplète. Configurez EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY et EMAILJS_PRIVATE_KEY.',
        },
        501,
      )
    }
    if (!hasEmailJs && !hasResend && !hasSmtp) {
      return json(
        {
          sent: false,
          error:
            "L'envoi d'emails n'est pas configuré sur ce projet. Ajoutez RESEND_API_KEY, puis déploiez : supabase functions deploy order-notification --no-verify-jwt",
        },
        501,
      )
    }

    const { order_id: orderId } = await req.json().catch(() => ({}))
    if (!orderId) return json({ sent: false, error: 'order_id est obligatoire' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Only a real, persisted order may trigger an email. This is what stops
    // the endpoint from being used as a mail relay.
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) return json({ sent: false, error: orderError.message }, 500)
    if (!order) return json({ sent: false, error: 'Commande introuvable' }, 404)

    const { data: items } = await admin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('id')

    const { data: settings } = await admin.from('admin_settings').select('contact_email').maybeSingle()

    // Precedence: ORDER_TO secret, then the Admin -> Settings value, then the
    // built-in store address, so orders are never silently dropped.
    const configuredRecipients = Deno.env.get('ORDER_TO') || settings?.contact_email || STORE_ADMIN_EMAIL
    const to = [...new Set(configuredRecipients.split(/[,\n;]/).map((email) => email.trim()).filter(Boolean))]
    if (!to.length) to.push(STORE_ADMIN_EMAIL)

    const rows = (items ?? [])
      .map(
        (item: Record<string, unknown>) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;">
            <strong>${esc(item.product_name)}</strong><br />
            <span style="color:#666;font-size:12px;">
              ${[item.color, item.size].filter(Boolean).map(esc).join(' / ') || 'Taille unique'}
              &nbsp;·&nbsp;× ${esc(item.quantity)}
            </span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;text-align:right;white-space:nowrap;">
            ${money(item.total_price)}
          </td>
        </tr>`,
      )
      .join('')

    const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:#111;max-width:640px;">
      <h1 style="font-size:18px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">
        Nouvelle commande avec paiement à la livraison
      </h1>
      <p style="margin:0 0 20px;color:#666;">
        ${esc(order.order_number)} · ${new Date(order.created_at).toUTCString()}
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th align="left" style="padding:8px 12px;border-bottom:2px solid #111;font-size:11px;text-transform:uppercase;">Article</th>
            <th align="right" style="padding:8px 12px;border-bottom:2px solid #111;font-size:11px;text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;">
        <tr><td style="padding:4px 0;color:#666;">Sous-total</td><td align="right">${money(order.subtotal)}</td></tr>
        ${
          Number(order.discount) > 0
            ? `<tr><td style="padding:4px 0;color:#c00;">Remise${order.coupon_code ? ` (${esc(order.coupon_code)})` : ''}</td><td align="right;color:#c00;">− ${money(order.discount)}</td></tr>`
            : ''
        }
        <tr><td style="padding:4px 0;color:#666;">Livraison</td><td align="right">${money(order.shipping_cost)}</td></tr>
        <tr><td style="padding:10px 0;border-top:2px solid #111;font-weight:bold;">Total</td><td align="right;font-weight:bold;">${money(order.total)}</td></tr>
      </table>

      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:28px 0 8px;">Client</h2>
      <table style="font-size:14px;line-height:1.7;">
        <tr><td style="color:#666;width:90px;">Nom</td><td><strong>${esc(order.customer_name)}</strong></td></tr>
        <tr><td style="color:#666;">Téléphone</td><td><strong>${esc(order.phone)}</strong></td></tr>
        ${order.customer_email ? `<tr><td style="color:#666;">Email</td><td>${esc(order.customer_email)}</td></tr>` : ''}
        <tr><td style="color:#666;">Adresse</td><td>${esc(order.address)}, ${esc(order.city)}, ${esc(order.governorate)}</td></tr>
        ${order.additional_info ? `<tr><td style="color:#666;">Remarques</td><td>${esc(order.additional_info)}</td></tr>` : ''}
      </table>
    </div>`

    const text = [
      `Nouvelle commande ${order.order_number}`,
      '',
      ...(items ?? []).map(
        (item: Record<string, unknown>) =>
          `- ${item.product_name} | ${[item.color, item.size].filter(Boolean).join(' / ') || 'Taille unique'} | x${item.quantity} | ${money(item.total_price)}`,
      ),
      '',
      `Sous-total : ${money(order.subtotal)}`,
      `Total : ${money(order.total)}`,
      '',
      `Client : ${order.customer_name}`,
      `Téléphone : ${order.phone}`,
      `Adresse : ${order.address}, ${order.city}, ${order.governorate}`,
    ].join('\n')

    const subject = `Nouvelle commande ${order.order_number} — ${order.customer_name} — ${money(order.total)}`

    if (hasEmailJs) {
      const invoicePdf = await createOrderPdf(order, (items ?? []) as Record<string, unknown>[])
      const pdfPath = `orders/${order.id}.pdf`
      const { error: uploadError } = await admin.storage
        .from('order-pdfs')
        .upload(pdfPath, invoicePdf, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) {
        console.error('order PDF upload failed', uploadError.message)
        return json({ sent: false, error: "Impossible de préparer le PDF de la commande" }, 500)
      }

      const { data: signedPdf, error: signedUrlError } = await admin.storage
        .from('order-pdfs')
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 7, {
          download: `COBRA-TN-Commande-${order.order_number}.pdf`,
        })

      if (signedUrlError || !signedPdf) {
        console.error('order PDF link creation failed', signedUrlError?.message)
        return json({ sent: false, error: "Impossible de créer le lien de téléchargement du PDF" }, 500)
      }

      const orderPdfUrl = new URL(signedPdf.signedUrl, `${Deno.env.get('SUPABASE_URL')}/`).toString()
      const orderSummary = [
        `Nouvelle commande ${order.order_number}`,
        `Date : ${new Date(order.created_at).toUTCString()}`,
        '',
        ...(items ?? []).map(
          (item: Record<string, unknown>) =>
            `- ${item.product_name} | ${[item.color, item.size].filter(Boolean).join(' / ') || 'Taille unique'} | x${item.quantity} | ${money(item.total_price)}`,
        ),
        '',
        `Sous-total : ${money(order.subtotal)}`,
        ...(Number(order.discount) > 0 ? [`Remise : ${money(order.discount)}`] : []),
        `Livraison : ${money(order.shipping_cost)}`,
        `Total : ${money(order.total)}`,
        '',
        `Client : ${order.customer_name}`,
        `Téléphone : ${order.phone}`,
        ...(order.customer_email ? [`Email : ${order.customer_email}`] : []),
        `Adresse : ${order.address}, ${order.city}, ${order.governorate}`,
        ...(order.additional_info ? [`Remarques : ${order.additional_info}`] : []),
      ].join('\n')

      for (const [index, recipient] of to.entries()) {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: emailJsServiceId,
            template_id: emailJsTemplateId,
            user_id: emailJsPublicKey,
            accessToken: emailJsPrivateKey,
            template_params: {
              to_email: recipient,
              subject,
              order_summary: orderSummary,
              order_id: order.order_number,
              order_date: new Date(order.created_at).toUTCString(),
              orders: (items ?? []).map((item: Record<string, unknown>) => ({
                name: item.product_name,
                units: item.quantity,
                price: money(item.unit_price),
                line_total: money(item.total_price),
                image: item.image_url || '',
              })),
              cost: {
                subtotal: money(order.subtotal),
                shipping: money(order.shipping_cost),
                tax: money(0),
                discount: money(order.discount),
                total: money(order.total),
              },
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              customer_phone: order.phone,
              customer_address: `${order.address}, ${order.city}, ${order.governorate}`,
              additional_info: order.additional_info || '',
              order_pdf_url: orderPdfUrl,
            },
          }),
        })

        if (!response.ok) {
          console.error('emailjs failed', response.status)
          return json({ sent: false, error: "Le fournisseur d'emails a rejeté le message" }, 502)
        }

        if (index < to.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1100))
        }
      }

      return json({ sent: true, to, transport: 'emailjs' })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      // Resend's free tier only allows the shared onboarding@resend.dev sender,
      // which delivers solely to the account owner's inbox. Any other From must
      // come from a verified domain, so default it to the free sender instead
      // of failing when only RESEND_API_KEY has been configured.
      const from = Deno.env.get('ORDER_FROM') || 'COBRA TN <onboarding@resend.dev>'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('resend failed', res.status, detail)
        return json({ sent: false, error: "Le fournisseur d'emails a rejet� le message" }, 502)
      }
      return json({ sent: true, to, transport: 'resend' })
    }

    // Gmail / any SMTP account via App Password. No domain or third-party
    // provider needed; the From must be the account's own address, which is
    // why it is forced here and not taken from the request.
    const smtpPass = Deno.env.get('SMTP_PASS')
    const smtpUser = Deno.env.get('SMTP_USER') || STORE_ADMIN_EMAIL
    const { default: nodemailer } = await import('npm:nodemailer@6.10.1')
    const transport = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(Deno.env.get('SMTP_PORT')) || 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const res = await transport.sendMail({
      from: `"COBRA TN" <${smtpUser}>`,
      to,
      subject,
      html,
      text,
    })

    if (!res || !res.accepted?.length) {
      console.error('smtp failed', res?.rejected, res?.response)
      return json({ sent: false, error: "Le fournisseur d'emails a rejet� le message" }, 502)
    }

    return json({ sent: true, id: String(res.messageId || ''), to, transport: 'smtp' })
  } catch (err) {
    console.error('order-notification failed', err)
    return json({ sent: false, error: 'Erreur inattendue' }, 500)
  }
})
