'use client'

import { AlertTriangle } from 'lucide-react'
import MaxWidthWrapper from './MaxWidthWrapper'

const UnauthorizedPage = () => (
  <MaxWidthWrapper className="py-20 text-center space-y-6">
    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
    <h1 className="text-2xl font-semibold text-destructive">Brak dostępu</h1>
    <p className="text-muted-foreground">
      Nie masz uprawnień do przeglądania tej sekcji.
    </p>
  </MaxWidthWrapper>
)

export default UnauthorizedPage
