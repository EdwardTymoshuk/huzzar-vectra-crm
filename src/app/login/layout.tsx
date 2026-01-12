// src/app/login/layout.tsx

import '../globals.css'

export const metadata = {
  title: 'Login | HUZZAR CRM',
  description: 'Secure login to HUZZAR CRM',
}

const LoginLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export default LoginLayout
