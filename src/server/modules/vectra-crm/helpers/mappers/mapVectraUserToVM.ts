// src/server/modules/vectra-crm/helpers/mappers/mapVectraUserToVM.ts

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
 * Maps a VectraUser relation to a UserVM.
 * This function acts as a boundary between Prisma models
 * and UI-facing view models.
 */
export const mapVectraUserToVM = (
  v: { userId: string; user: { id: string; name: string } } | null
): UserVM | null => {
  if (!v) return null

  return {
    id: v.user.id,
    name: v.user.name,
  }
}
