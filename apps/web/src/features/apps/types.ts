import type { PackageInfo } from '@/lib/api'

export type PackageTypeFilter = 'all' | PackageInfo['type']
export type PackageStateFilter = 'all' | PackageInfo['state']
export type PackageAssessmentFilter = 'all' | 'protected' | 'optional' | 'review'
