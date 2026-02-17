import nodemailer from 'nodemailer'

type SendOplFailureEmailParams = {
  fromEmail: string
  fromName: string
  subject: string
  body: string
  attachments?: Array<{
    filename: string
    contentType?: string
    contentBase64: string
  }>
}

export async function sendOplFailureEmail({
  fromEmail,
  fromName,
  subject,
  body,
  attachments = [],
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

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail || smtpUser}>`,
    to: 'cok.orange@huzzar.com.pl',
    replyTo: fromEmail || smtpUser,
    subject,
    text: body,
    attachments: attachments.map((file) => ({
      filename: file.filename,
      content: Buffer.from(file.contentBase64, 'base64'),
      contentType: file.contentType || 'application/octet-stream',
    })),
    headers: {
      'X-Auto-Response-Suppress': 'All',
      Precedence: 'bulk',
    },
  })
}
