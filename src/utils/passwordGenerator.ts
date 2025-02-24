/**
 * Generates a strong password matching specified criteria:
 * - 8-32 characters
 * - Includes uppercase, lowercase, digit, and special character
 */
export const generateStrongPassword = (): string => {
  const length = Math.floor(Math.random() * (32 - 8 + 1)) + 8
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}[]<>?'
  let password = ''
  while (true) {
    password = Array.from(
      { length },
      () => charset[Math.floor(Math.random() * charset.length)]
    ).join('')
    if (
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*()_+{}[\]<>?]/.test(password)
    )
      break
  }
  return password
}
