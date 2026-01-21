// src/server/modules/opl-crm/helpers/mappers/mapOplUserToVM.ts

/**
 * UserVM
 * ------------------------------------------------------------
 * Minimal, UI-safe representation of a user.
 * Used across VECTRA CRM views.
 */
export interface UserVM {
  id: string
  name: string
}

/**
 * Maps a OplUser relation to a UserVM.
 * This function acts as a boundary between Prisma models
 * and UI-facing view models.
 */
export const mapOplUserToVM = (
  v: { userId: string; user: { id: string; name: string } } | null
): UserVM | null => {
  if (!v) return null

  return {
    id: v.user.id,
    name: v.user.name,
  }
}
