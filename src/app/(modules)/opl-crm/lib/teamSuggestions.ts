type TeamVM = {
  technician1Id: string
  technician2Id: string
  active?: boolean
}

export const getSuggestedOplTeamPartnerId = (
  teams: TeamVM[] | undefined,
  primaryTechnicianId: string | undefined
): string | null => {
  if (!teams?.length || !primaryTechnicianId) return null

  for (const team of teams) {
    if (team.active === false) continue
    if (team.technician1Id === primaryTechnicianId) return team.technician2Id
    if (team.technician2Id === primaryTechnicianId) return team.technician1Id
  }

  return null
}
