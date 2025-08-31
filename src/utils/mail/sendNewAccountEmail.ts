// src/lib/mail/sendNewAccountEmail.ts
import nodemailer from 'nodemailer'

interface SendNewAccountEmailParams {
  to: string
  name: string
  email: string
  password: string
}

/**
 * Sends an account creation email with login credentials to a new employee.
 * The message is in Polish and includes system login instructions.
 */
export async function sendNewAccountEmail({
  to,
  name,
  email,
  password,
}: SendNewAccountEmailParams) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // set to true if you use port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  await transporter.sendMail({
    cc: 'cok@huzzar.pl',
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to,
    replyTo: 'no-reply@huzzar.pl',
    subject: 'Twoje konto w systemie HUZZAR VECTRA CRM',
    headers: {
      'X-Auto-Response-Suppress': 'All',
      Precedence: 'bulk',
    },
    html: `
      <p>Witaj, <strong>${name}</strong>,</p>
      <p>Twoje konto w systemie <strong>HUZZAR VECTRA CRM</strong> zostało utworzone.</p>
      <p>Możesz zalogować się do panelu technika pod adresem:</p>
      <p><a href="https://vectra-crm.huzzar.pl">https://vectra-crm.huzzar.pl</a></p>
      <p><strong>Login (adres e-mail):</strong> ${email}</p>
      <p><strong>Hasło tymczasowe:</strong><br /> ${password}</p>
      <p>Ze względów bezpieczeństwa zalecamy zmianę hasła przy pierwszym logowaniu.</p>
      <br />
      <p style="font-size:12px; color:#666; margin-top:24px;">
  Ta wiadomość została wysłana automatycznie. Prosimy na nią nie odpowiadać.
</p>
      <br/>
    `,
  })
}
