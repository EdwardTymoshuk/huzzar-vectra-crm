import { OplTechnicianAssignment } from '@/types/opl-crm'

type AssignmentOrder = OplTechnicianAssignment['slots'][number]['orders'][number]

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
  assignments: OplTechnicianAssignment[]
): OplTechnicianAssignment[] => {
  const rows = new Map<string, OplTechnicianAssignment>()
  const rowOrder: string[] = []
  const insertedKeys = new Set<string>()

  const techWithSoloOrders = new Set<string>()
  const techInTeamOrders = new Set<string>()

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

  assignments.forEach((tech) => {
    tech.slots.forEach((slot) => {
      slot.orders.forEach((order) => {
        const assigned = order.assignedTechnicians ?? []
        const isTeamOrder = assigned.length > 1

        if (isTeamOrder) {
          const ids = assigned.map((t) => t.id)
          const names = assigned.map((t) => t.name)
          ids.forEach((id) => techInTeamOrders.add(id))

          const key = `team:${ids.join('|')}`
          const row = ensureRow(key, names.join(' / '), ids[0] ?? null, {
            dropTargetId: key,
            teamTechnicianIds: ids,
          })
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

  assignments.forEach((tech) => {
    const key = `tech:${tech.technicianId ?? tech.technicianName}`
    if (rows.has(key)) return

    const techId = tech.technicianId
    const hasSolo = techId ? techWithSoloOrders.has(techId) : false
    const isTeamOnly = techId ? techInTeamOrders.has(techId) && !hasSolo : false
    ensureRow(key, tech.technicianName, tech.technicianId, {
      dropTargetId: tech.technicianId ?? undefined,
      teamTechnicianIds: isTeamOnly ? [] : undefined,
    })
  })

  return rowOrder.map((key) => rows.get(key)!).filter(Boolean)
}
