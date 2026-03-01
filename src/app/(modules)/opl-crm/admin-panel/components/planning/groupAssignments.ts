import { OplTechnicianAssignment } from '@/types/opl-crm'

type AssignmentOrder = OplTechnicianAssignment['slots'][number]['orders'][number]
type PlannerTeam = {
  id: string
  name: string
  active: boolean
  technician1Id: string
  technician2Id: string
  technician1Name: string
  technician2Name: string
}

const cloneOrder = (order: AssignmentOrder): AssignmentOrder => ({ ...order })

/**
 * Groups multi-technician orders into a single virtual team row:
 * "Technik A / Technik B".
 * - Team orders are shown once, under the first assigned technician.
 * - Solo orders stay under their technician.
 * - Technicians that only appear in team rows are hidden as empty duplicates.
 * - Other technicians without orders remain visible (empty row).
 */
export const groupAssignmentsForTeams = (
  assignments: OplTechnicianAssignment[],
  teams: PlannerTeam[] = []
): OplTechnicianAssignment[] => {
  const techById = new Map(
    assignments
      .filter((a) => Boolean(a.technicianId))
      .map((a) => [a.technicianId as string, a])
  )
  const activeTeams = teams.filter(
    (team) =>
      team.active &&
      techById.has(team.technician1Id) &&
      techById.has(team.technician2Id)
  )
  const teamByMemberId = new Map<string, PlannerTeam>()
  activeTeams.forEach((team) => {
    teamByMemberId.set(team.technician1Id, team)
    teamByMemberId.set(team.technician2Id, team)
  })
  const teamByPairKey = new Map<string, PlannerTeam>()
  activeTeams.forEach((team) => {
    const key = [team.technician1Id, team.technician2Id]
      .sort((a, b) => a.localeCompare(b))
      .join('|')
    teamByPairKey.set(key, team)
  })

  const rows = new Map<string, OplTechnicianAssignment>()
  const rowOrder: string[] = []
  const insertedKeys = new Set<string>()

  const techWithSoloOrders = new Set<string>()

  const ensureRow = (
    key: string,
    technicianName: string,
    technicianId: string | null,
    options?: {
      dropTargetId?: string
      teamTechnicianIds?: string[]
    }
  ) => {
    let row = rows.get(key)
    if (!row) {
      row = {
        rowId: key,
        dropTargetId: options?.dropTargetId,
        teamTechnicianIds: options?.teamTechnicianIds,
        technicianName,
        technicianId,
        slots: [],
      }
      rows.set(key, row)
      rowOrder.push(key)
    }
    return row
  }

  const pushToSlot = (
    rowKey: string,
    row: OplTechnicianAssignment,
    timeSlot: OplTechnicianAssignment['slots'][number]['timeSlot'],
    order: AssignmentOrder
  ) => {
    const dedupeKey = `${rowKey}__${String(timeSlot)}__${order.id}`
    if (insertedKeys.has(dedupeKey)) return
    insertedKeys.add(dedupeKey)

    let slot = row.slots.find((s) => s.timeSlot === timeSlot)
    if (!slot) {
      slot = { timeSlot, orders: [] }
      row.slots.push(slot)
    }
      slot.orders.push(cloneOrder(order))
  }

  // 1) Always create rows for active teams (planner should show teams first).
  activeTeams.forEach((team) => {
    const teamKey = `team:${team.id}`
    ensureRow(teamKey, team.name, team.technician1Id, {
      dropTargetId: `team:${team.technician1Id}|${team.technician2Id}`,
      teamTechnicianIds: [team.technician1Id, team.technician2Id],
    })
  })

  // 2) Place orders.
  assignments.forEach((tech) => {
    tech.slots.forEach((slot) => {
      slot.orders.forEach((order) => {
        const assigned = order.assignedTechnicians ?? []
        const isTeamOrder = assigned.length > 1

        if (isTeamOrder) {
          const ids = assigned.map((t) => t.id).sort((a, b) => a.localeCompare(b))
          const names = assigned.map((t) => t.name)
          const matchedTeam = teamByPairKey.get(ids.join('|'))
          const key = matchedTeam ? `team:${matchedTeam.id}` : `team:${ids.join('|')}`
          const row = ensureRow(
            key,
            matchedTeam?.name ?? names.join(' / '),
            ids[0] ?? null,
            {
              dropTargetId: matchedTeam
                ? `team:${matchedTeam.technician1Id}|${matchedTeam.technician2Id}`
                : `team:${ids.join('|')}`,
              teamTechnicianIds: ids,
            }
          )
          pushToSlot(key, row, slot.timeSlot, order)
          return
        }

        if (tech.technicianId) techWithSoloOrders.add(tech.technicianId)
        const key = `tech:${tech.technicianId ?? tech.technicianName}`
        const row = ensureRow(key, tech.technicianName, tech.technicianId, {
          dropTargetId: tech.technicianId ?? undefined,
        })
        pushToSlot(key, row, slot.timeSlot, order)
      })
    })
  })

  // 3) Keep solo rows only when needed:
  // - technician is not part of active team
  // - OR has solo order (modified assignment / teammate unavailable)
  assignments.forEach((tech) => {
    const key = `tech:${tech.technicianId ?? tech.technicianName}`
    if (rows.has(key)) return

    const techId = tech.technicianId
    const hasSolo = techId ? techWithSoloOrders.has(techId) : false
    const hasActiveTeam = techId ? teamByMemberId.has(techId) : false
    if (hasActiveTeam && !hasSolo) return

    ensureRow(key, tech.technicianName, tech.technicianId, {
      dropTargetId: tech.technicianId ?? undefined,
    })
  })

  return rowOrder.map((key) => rows.get(key)!).filter(Boolean)
}
