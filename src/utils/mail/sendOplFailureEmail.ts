import nodemailer from 'nodemailer'

type SendOplFailureEmailParams = {
  fromEmail: string
  fromName: string
  orderNumber: string
  orderAddress: string
  failureReason: string
  notes?: string | null
}

export async function sendOplFailureEmail({
  fromEmail,
  fromName,
  orderNumber,
  orderAddress,
  failureReason,
  notes,
}: SendOplFailureEmailParams) {
  const host = process.env.EMAIL_HOST?.trim()
  const portRaw = process.env.EMAIL_PORT?.trim()
  const smtpUser = process.env.EMAIL_USER?.trim()
  const smtpPass = process.env.EMAIL_PASS

  if (!host || !portRaw || !smtpUser || !smtpPass) {
    throw new Error('SMTP_CONFIG_MISSING')
  }

  const port = Number(portRaw)
  if (!Number.isFinite(port)) {
    throw new Error('SMTP_CONFIG_INVALID_PORT')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const subject = `${orderNumber} - ${orderAddress}`
  const text = [
    `Numer zlecenia: ${orderNumber}`,
    `Adres: ${orderAddress}`,
    '',
    `Powód niewykonania: ${failureReason.trim()}`,
    `Uwagi: ${notes?.trim() || '-'}`,
  ].join('\n')

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail || smtpUser}>`,
    sender: smtpUser,
    to: 'cok.orange@huzzar.com.pl',
    replyTo: fromEmail || smtpUser,
    subject,
    text,
    headers: {
      'X-Auto-Response-Suppress': 'All',
      Precedence: 'bulk',
    },
  })
}
