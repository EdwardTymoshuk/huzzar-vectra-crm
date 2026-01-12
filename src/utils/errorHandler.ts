// utils/errorHandler.ts

import { AppRouter } from '@/server/routers'
import { TRPCClientError } from '@trpc/client'

type AppError = TRPCClientError<AppRouter>

/** Guard: detects a TRPC client error for our AppRouter. */
export const isTrpcError = (e: unknown): e is AppError =>
  e instanceof TRPCClientError

/** Guard: detects a native JS Error. */
export const isNativeError = (e: unknown): e is Error => e instanceof Error

/**
 * Maps any thrown value to a safe, user-friendly message.
 * We never expose raw technical details to end users.
 */
export const getErrMessage = (err: unknown): string => {
  if (isTrpcError(err)) {
    const code = err.data?.code
    switch (code) {
      case 'UNAUTHORIZED':
        return 'Brak autoryzacji. Zaloguj się ponownie.'
      case 'FORBIDDEN':
        return 'Brak uprawnień do wykonania tej operacji.'
      case 'NOT_FOUND':
        return 'Nie znaleziono zasobu. Odśwież widok i spróbuj ponownie.'
      case 'CONFLICT':
        return 'Konflikt danych. Odśwież widok i spróbuj ponownie.'
      case 'BAD_REQUEST':
        return 'Nieprawidłowe dane. Sprawdź formularz i spróbuj ponownie.'
      default:
        return 'Wystąpił błąd serwera. Spróbuj ponownie później lub skontaktuj się z administratorem.'
    }
  }

  if (isNativeError(err)) {
    return 'Wystąpił błąd aplikacji. Spróbuj ponownie później.'
  }

  if (typeof err === 'string') {
    return 'Wystąpił błąd. Spróbuj ponownie później.'
  }

  return 'Nieznany błąd. Skontaktuj się z administratorem.'
}
