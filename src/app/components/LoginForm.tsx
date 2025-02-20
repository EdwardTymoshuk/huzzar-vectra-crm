'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import MaxWidthWrapper from '../components/MaxWidthWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import Logo from './Logo'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const handleLogin = async () => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    // Handle login errors
    if (result?.error) {
      setError('Nieprawidłowy adres e-mail lub hasło')
    } else {
      router.push(callbackUrl) // Redirect to the originally requested page after successful login
    }
  }

  return (
    <MaxWidthWrapper>
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-sm p-6 bg-card border border-border rounded-lg shadow">
          {/* Logo above the form */}
          <div className="flex justify-center mb-4">
            <Logo />
          </div>

          <h2 className="text-xl font-bold text-center mb-4">Logowanie</h2>
          {error && <p className="text-danger text-center">{error}</p>}

          <Input
            type="email"
            placeholder="Adres e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-2"
          />

          {/* Password input with show/hide toggle */}
          <div className="relative mb-4">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-500"
            >
              {showPassword ? (
                <MdVisibilityOff size={24} />
              ) : (
                <MdVisibility size={24} />
              )}
            </button>
          </div>

          <Button onClick={handleLogin} className="w-full">
            Zaloguj się
          </Button>

          {/* Forgot password text */}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Zapomniałeś hasła? Skontaktuj się z administratorem.
          </p>
        </div>
      </div>
    </MaxWidthWrapper>
  )
}
