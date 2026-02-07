import { DigInput } from '../hooks/useOplWorkCodes'

/**
 * Calculates additional DIG work codes based on base code and user input.
 */
export const calculateDigAddons = (
  input: DigInput
): Partial<Record<'ZJDD' | 'ZJKD' | 'ZJND', number>> => {
  switch (input.type) {
    case 'ZJD': {
      const extra = Math.max(0, input.meters - 20)
      return {
        ZJDD: Math.ceil(extra / 10),
      }
    }

    case 'ZJK': {
      const extra = Math.max(0, input.meters - 50)
      return {
        ZJKD: Math.ceil(extra / 10),
      }
    }

    case 'ZJN': {
      const extra = Math.max(0, input.points - 2)
      return {
        ZJND: extra,
      }
    }
  }
}
