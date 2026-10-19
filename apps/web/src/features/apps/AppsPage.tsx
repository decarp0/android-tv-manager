import { useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, LoaderCircle, Package, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import type { PackageInfo } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeading } from '@/components/PageHeading'
import { maxApkSize, optionalServiceHints, packageAssessment } from './model'
import type { PackageAssessmentFilter, PackageStateFilter, PackageTypeFilter } from './types'

export function AppsPage({
  assessmentFilter,
  busy,
  filteredPackages,
  loading,
  onInstall,
  onAssessmentFilterChange,
  onSearch,
  onStateFilterChange,
  onTypeFilterChange,
  onUninstall,
  onAction,
  onRefresh,
  packages,
  ready,
  search,
  serial,
  stateFilter,
  typeFilter,
}: {
  assessmentFilter: PackageAssessmentFilter
  busy: string
  filteredPackages: PackageInfo[]
  loading: boolean
  onInstall: (file: File) => Promise<boolean>
  onAssessmentFilterChange: (filter: PackageAssessmentFilter) => void
  onSearch: (query: string) => void
  onStateFilterChange: (filter: PackageStateFilter) => void
  onTypeFilterChange: (filter: PackageTypeFilter) => void
  onUninstall: (packageName: string) => void
  onAction: (packageName: string, action: 'disable' | 'enable' | 'uninstall') => void
  onRefresh: () => void
  packages: PackageInfo[]
  ready: boolean
  search: string
  serial: string
  stateFilter: PackageStateFilter
  typeFilter: PackageTypeFilter
}) {
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [apkFileError, setApkFileError] = useState('')
  const apkInputRef = useRef<HTMLInputElement>(null)
  const disabledCount = packages.filter((item) => item.state === 'disabled').length

  async function submitApk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!apkFile) return
    if (await onInstall(apkFile)) {
      setApkFile(null)
      if (apkInputRef.current) apkInputRef.current.value = ''
    }
  }

  return (
    <div className="page-stack">
      <PageHeading eyebrow="APP MANAGEMENT" title="Installed apps" description="Review packages installed for Android's primary user. Prefer disabling before uninstalling." />
      <div className="stats-strip">
        <div><span>Packages</span><strong>{packages.length}</strong></div>
        <div><span>Disabled</span><strong>{disabledCount}</strong></div>
        <div><span>Protected</span><strong>{packages.filter((item) => item.protected).length}</strong></div>
        <div><span>Target</span><strong>{serial || 'Not connected'}</strong></div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Install APK</CardTitle>
          <CardDescription>Send one APK from this computer to the connected TV over Wi-Fi. Existing apps update only when signing keys match; install only files from sources you trust.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submitApk}>
            <FieldGroup className="min-w-0 flex-1">
              <Field data-invalid={Boolean(apkFileError)}>
                <FieldLabel htmlFor="apk-file">APK file</FieldLabel>
                <Input
                  accept=".apk,application/vnd.android.package-archive"
                  aria-invalid={Boolean(apkFileError)}
                  disabled={busy === 'install'}
                  id="apk-file"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null
                    setApkFile(null)
                    if (!file) {
                      setApkFileError('')
                      return
                    }
                    if (!file.name.toLowerCase().endsWith('.apk')) {
                      event.currentTarget.value = ''
                      setApkFileError('Choose a single .apk file. Split .apks/.xapk bundles are not supported.')
                    } else if (file.size === 0) {
                      event.currentTarget.value = ''
                      setApkFileError('The selected APK file is empty.')
                    } else if (file.size > maxApkSize) {
                      event.currentTarget.value = ''
                      setApkFileError('APK files must be 512 MiB or smaller.')
                    } else {
                      setApkFileError('')
                      setApkFile(file)
                    }
                  }}
                  ref={apkInputRef}
                  type="file"
                />
                <FieldDescription>Single .apk files up to 512 MiB. Split APK bundles are not supported.</FieldDescription>
                {apkFileError && <FieldError>{apkFileError}</FieldError>}
              </Field>
            </FieldGroup>
            <Button disabled={!ready || !apkFile || Boolean(apkFileError) || Boolean(busy)} size="sm" type="submit">
              {busy === 'install' ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Package data-icon="inline-start" />}
              {busy === 'install' ? 'Uploading and installing…' : 'Install APK'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <div className="table-toolbar apps-table-toolbar">
          <div>
            <div className="toolbar-title">Package list</div>
            <div className="toolbar-caption">{filteredPackages.length} of {packages.length} packages</div>
          </div>
          <div className="table-toolbar-actions">
            <Button disabled={!ready || loading} onClick={onRefresh} size="sm" variant="outline"><RefreshCw data-icon="inline-start" />Refresh</Button>
          </div>
          <div className="apps-filter-row">
            <div className="search-field apps-package-search"><Search aria-hidden="true" /><Input aria-label="Search package, installer, or service" onChange={(event) => onSearch(event.target.value)} placeholder="Search packages..." value={search} /></div>
            <NativeSelect aria-label="Filter by app type" className="apps-filter-select" onChange={(event) => onTypeFilterChange(event.target.value as PackageTypeFilter)} size="sm" value={typeFilter}>
              <NativeSelectOption value="all">All types</NativeSelectOption>
              <NativeSelectOption value="system">System</NativeSelectOption>
              <NativeSelectOption value="user">Third-party</NativeSelectOption>
            </NativeSelect>
            <NativeSelect aria-label="Filter by app state" className="apps-filter-select" onChange={(event) => onStateFilterChange(event.target.value as PackageStateFilter)} size="sm" value={stateFilter}>
              <NativeSelectOption value="all">Any state</NativeSelectOption>
              <NativeSelectOption value="enabled">Enabled</NativeSelectOption>
              <NativeSelectOption value="disabled">Disabled</NativeSelectOption>
            </NativeSelect>
            <NativeSelect aria-label="Filter by assessment" className="apps-filter-select" onChange={(event) => onAssessmentFilterChange(event.target.value as PackageAssessmentFilter)} size="sm" value={assessmentFilter}>
              <NativeSelectOption value="all">Any assessment</NativeSelectOption>
              <NativeSelectOption value="protected">Protected</NativeSelectOption>
              <NativeSelectOption value="optional">Optional service</NativeSelectOption>
              <NativeSelectOption value="review">Review first</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <div className="table-card-content">
          <Table>
            <TableHeader><TableRow><TableHead>Package</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredPackages.map((item) => {
                const optionalService = optionalServiceHints.get(item.packageName)
                const assessment = packageAssessment(item)
                return (
                  <TableRow key={item.packageName}>
                    <TableCell className="package-name-cell whitespace-normal">
                      <div className="package-name">{item.packageName}</div>
                    </TableCell>
                    <TableCell className="package-details-cell whitespace-normal">
                      <div className="package-info-badges">
                        <Badge variant={item.type === 'system' ? 'outline' : 'secondary'}>{item.type === 'system' ? 'System package' : 'Third-party app'}</Badge>
                        <Badge variant={item.state === 'disabled' ? 'outline' : 'secondary'}>{item.state}</Badge>
                        {assessment === 'protected' ? (
                          <Badge variant="outline"><ShieldCheck data-icon="inline-start" />Protected</Badge>
                        ) : assessment === 'optional' ? (
                          <Badge variant="secondary">Optional service</Badge>
                        ) : (
                          <span className="muted-copy">Review first</span>
                        )}
                      </div>
                      <div className="package-meta">
                        {item.installer ? `Installer: ${item.installer}` : 'Installer not reported'} · UID {item.uid ?? 'unknown'}{optionalService ? ` · ${optionalService}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.protected ? (
                        <span className="muted-copy">Protected</span>
                      ) : (
                        <div className="row-actions">
                          <Button disabled={!ready || busy === item.packageName} onClick={() => onAction(item.packageName, item.state === 'disabled' ? 'enable' : 'disable')} size="sm" variant="outline">
                            {busy === item.packageName ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
                            {item.state === 'disabled' ? 'Enable' : 'Disable'}
                          </Button>
                          {item.type === 'user' && <Button disabled={!ready || busy === item.packageName} onClick={() => onUninstall(item.packageName)} size="sm" variant="ghost">Uninstall</Button>}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredPackages.length === 0 && <TableRow><TableCell className="empty-table" colSpan={3}>{loading ? 'Loading packages…' : serial ? 'No packages match the current search and filters.' : 'Connect to a Wi-Fi ADB device to list packages.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>
      <div className="helper-note"><AlertTriangle aria-hidden="true" /><span>Android type reflects this device's package classification, not an app's usual role or install method. User-facing apps like Netflix can be OEM-preloaded and still appear as system packages. Known Netflix, Prime Video and Disney+ packages are marked optional services; keep them if you use them. Other packages are unclassified, so review unfamiliar apps before changing them. Protected launcher, Settings, Play services and core system packages are blocked.</span></div>
    </div>
  )
}
