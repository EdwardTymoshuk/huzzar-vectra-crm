export const genUUID = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as any).randomUUID === 'function'
  ) {
    return (crypto as any).randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
