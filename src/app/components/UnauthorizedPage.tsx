'use client'

import { Button } from '@/app/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MaxWidthWrapper from './MaxWidthWrapper'

const UnauthorizedPage = () => {
  const router = useRouter()

  return (
    <MaxWidthWrapper className="py-20 text-center space-y-6">
      <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-semibold text-destructive">Brak dostępu</h1>
      <p className="text-muted-foreground">
        Nie masz uprawnień do przeglądania tej sekcji.
      </p>

      <Button variant="outline" onClick={() => router.push('/')}>
        Wróć do strony głównej
      </Button>
    </MaxWidthWrapper>
  )
}

export default UnauthorizedPage
