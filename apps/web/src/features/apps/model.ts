import type { PackageInfo } from '@/lib/api'
import type { PackageAssessmentFilter } from './types'

export const optionalServiceHints = new Map([
  ['com.netflix.ninja', 'Netflix streaming app; optional if you do not use it.'],
  ['com.netflix.mediaclient', 'Netflix streaming app; optional if you do not use it.'],
  ['com.amazon.amazonvideo.livingroom', 'Prime Video app; optional if you do not use it.'],
  ['com.amazon.avod.thirdpartyclient', 'Prime Video app; optional if you do not use it.'],
  ['com.disney.disneyplus', 'Disney+ streaming app; optional if you do not use it.'],
])

export function packageAssessment(item: PackageInfo): Exclude<PackageAssessmentFilter, 'all'> {
  if (item.protected) return 'protected'
  return optionalServiceHints.has(item.packageName) ? 'optional' : 'review'
}

export const maxApkSize = 512 * 1024 * 1024
