import { OplBillingDraft } from '@/types/opl-crm'

/**
 * Validates OPL billing draft according to business rules.
 * Throws if invalid.
 */
export function validateOplBillingDraft(draft: OplBillingDraft): void {
  // 1. Exactly one base work
  if (!draft.baseWork) {
    throw new Error('Base work is required.')
  }

  // 2. Override modes
  const overrideBases = ['P1P', 'P2P', 'P3P', 'PUTD', 'DU']
  if (overrideBases.includes(draft.baseWork.code)) {
    if (draft.activation?.type) {
      throw new Error('Activation is not allowed for override base work.')
    }
  }

  // 3. Multiroom limits
  if (draft.activation && draft.activation.multiroomCount > 3) {
    throw new Error('Maximum 3 Multiroom units allowed.')
  }

  // 4. DMR rule
  const hasDMR = draft.addons.some((a) => a.code === 'DMR')
  if (hasDMR && !draft.activation) {
    throw new Error('DMR requires activation context.')
  }
}
