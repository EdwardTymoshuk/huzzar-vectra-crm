// import type { OplBillingDraft } from '@/types/opl-crm'
// import { OplAddonCode } from '@prisma/client'
// import { OplWorkCodesState } from '../hooks/useOplWorkCodes'

// /**
//  * Maps UI work code state into canonical billing draft.
//  */
// export const mapWorkCodesToBillingDraft = (
//   state: OplWorkCodesState
// ): OplBillingDraft => {
//   const addons: OplBillingDraft['addons'] = []

//   // Auto-added ZJWEW
//   if (state.base === 'ZJD' || state.base === 'ZJN' || state.base === 'ZJK') {
//     addons.push({
//       code: 'ZJWEW',
//       quantity: 1,
//       autoAdded: true,
//     })
//   }

//   // MR
//   if (state.mrCount > 0) {
//     addons.push({
//       code: 'MR',
//       quantity: state.mrCount,
//       autoAdded: false,
//     })
//   }

//   // UMZ
//   if (state.umz) {
//     addons.push({
//       code: 'UMZ',
//       quantity: 1,
//       autoAdded: false,
//     })
//   }

//   // Dig codes
//   for (const [code, meters] of Object.entries(state.dig)) {
//     if (!meters || meters <= 0) continue

//     addons.push({
//       code: code as OplAddonCode,
//       quantity: meters,
//       autoAdded: false,
//     })
//   }

//   return {
//     baseWork: state.base
//       ? {
//           code: state.base,
//         }
//       : null,

//     activation: state.activation
//       ? {
//           type: state.activation,
//           multiroomCount: state.mrCount,
//           umz: state.umz,
//         }
//       : null,

//     addons,
//     showAllCodes: false,
//   }
// }
