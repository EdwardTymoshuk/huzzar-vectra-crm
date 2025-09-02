// src/app/login/layout.tsx
// NOTE: This is a route segment layout. It MUST NOT render <html> or <body>.
// Root <html>/<body> are defined in src/app/layout.tsx.

import '../globals.css'

export const metadata = {
  title: 'Login | V-CRM HUZZAR',
  description: 'Technician/admin login page',
}

const LoginLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export default LoginLayout
