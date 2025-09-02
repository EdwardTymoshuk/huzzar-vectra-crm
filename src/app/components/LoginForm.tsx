'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import Logo from './Logo'
import MaxWidthWrapper from './shared/MaxWidthWrapper'

// Zod validation schema
const loginSchema = z.object({
  email: z.string().email('Podaj poprawny adres e-mail'),
  password: z.string().min(8, 'Hasło musi zawierać co najmniej 8 znaków'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()

  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleLogin = async (data: LoginFormData) => {
    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl,
    })

    if (res?.error) {
      toast.error(res.error || 'Nie udało się zalogować. Sprawdź dane.')
      return
    }

    if (res?.ok && res?.url) {
      window.location.href = res.url
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

          {/* Form with react-hook-form & zod validation */}
          <form onSubmit={handleSubmit(handleLogin)} noValidate>
            <div className="mb-2">
              <Input
                type="email"
                placeholder="Adres e-mail"
                {...register('email')}
                className={errors.email ? 'border-danger' : ''}
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
                className={`pr-10 ${errors.password ? 'border-danger' : ''}`}
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

export default LoginForm
