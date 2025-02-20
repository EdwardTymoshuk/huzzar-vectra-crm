'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { z } from 'zod'
import MaxWidthWrapper from '../components/MaxWidthWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import Logo from './Logo'

// Zod validation schema
const loginSchema = z.object({
  email: z.string().email('Podaj poprawny adres e-mail'),
  password: z.string().min(8, 'Hasło musi zawierać co najmniej 8 znaków'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleLogin = async (data: LoginFormData) => {
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      setLoginError('Nieprawidłowy adres e-mail lub hasło')
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <MaxWidthWrapper>
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-sm p-6 bg-card border border-border rounded-lg shadow">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>

          <h2 className="text-xl font-bold text-center mb-4">Logowanie</h2>
          {loginError && (
            <p className="text-danger text-center">{loginError}</p>
          )}

          {/* Form with react-hook-form & zod validation */}
          <form onSubmit={handleSubmit(handleLogin)} noValidate>
            <div className="mb-2">
              <Input
                type="email"
                placeholder="Adres e-mail"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-danger text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="relative mb-4">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Hasło"
                {...register('password')}
                className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
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
              {errors.password && (
                <p className="text-danger text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Zapomniałeś hasła? Skontaktuj się z administratorem.
          </p>
        </div>
      </div>
    </MaxWidthWrapper>
  )
}
