import { Network, Settings2, Wrench } from 'lucide-react'
import { ComingSoon } from '@/components/ComingSoon'
import { AppsPage } from '@/features/apps/AppsPage'
import { ConnectionPage } from '@/features/connection/ConnectionPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { LogcatPage } from '@/features/logcat/LogcatPage'
import { Overview } from '@/features/overview/Overview'
import { RemotePage } from '@/features/remote/RemotePage'
import { useAppContext } from '@/app/useAppContext'

export function PageContent() {
  const {
    section, setSection, connectedDevices, selectedDevice, packages, devices, host,
    connectDevice, disconnectDevice, setHost, setSerial, refreshDevices, serial,
    busy, token, port, setPort, pairingPort, setPairingPort, pairingCode,
    setPairingCode, pairDevice, isDeviceReady, setNotice, packageAssessmentFilter,
    setPackageAssessmentFilter, filteredPackages, loadingPackages, installApk,
    setPackageSearch, setPackageStateFilter, setPackageTypeFilter, setPendingUninstall,
    runPackageAction, refreshPackages, packageSearch, packageStateFilter,
    packageTypeFilter, logcatRunning, toggleLogcat, history, refreshHistory, undoChange,
  } = useAppContext()

  return (
    <>
      {section === 'Overview' && (
        <Overview
          connectedDevices={connectedDevices}
          onNavigate={setSection}
          selectedDevice={selectedDevice}
          packageCount={packages.length}
        />
      )}
      {section === 'Connection' && (
        <ConnectionPage
          devices={devices}
          host={host}
          onConnect={connectDevice}
          onDisconnect={disconnectDevice}
          onHostChange={setHost}
          onSelect={setSerial}
          onRefresh={refreshDevices}
          serial={serial}
          busy={busy}
          token={token}
          port={port}
          onPortChange={setPort}
          pairingPort={pairingPort}
          onPairingPortChange={setPairingPort}
          pairingCode={pairingCode}
          onPairingCodeChange={setPairingCode}
          onPair={pairDevice}
        />
      )}
      {section === 'Remote' && (
        <RemotePage key={serial} onNotice={setNotice} ready={Boolean(isDeviceReady)} serial={serial} token={token} />
      )}
      {section === 'Apps' && (
        <AppsPage
          assessmentFilter={packageAssessmentFilter}
          busy={busy}
          filteredPackages={filteredPackages}
          loading={loadingPackages}
          onInstall={installApk}
          onAssessmentFilterChange={setPackageAssessmentFilter}
          onSearch={setPackageSearch}
          onStateFilterChange={setPackageStateFilter}
          onTypeFilterChange={setPackageTypeFilter}
          onUninstall={(packageName) => setPendingUninstall({ packageName, serial })}
          onAction={runPackageAction}
          onRefresh={() => refreshPackages()}
          packages={packages}
          ready={Boolean(isDeviceReady)}
          search={packageSearch}
          serial={serial}
          stateFilter={packageStateFilter}
          typeFilter={packageTypeFilter}
        />
      )}
      {section === 'Logcat' && (
        <LogcatPage isRunning={logcatRunning} onToggle={toggleLogcat} ready={Boolean(isDeviceReady)} serial={serial} />
      )}
      {section === 'History' && (
        <HistoryPage
          busy={busy}
          history={history}
          onRefresh={() => refreshHistory()}
          onUndo={undoChange}
          ready={Boolean(isDeviceReady)}
          serial={serial}
        />
      )}
      {section === 'Network' && <ComingSoon title="Network diagnostics" description="Wi-Fi status, DNS, routing and connectivity checks are planned for the next milestone." icon={Network} />}
      {section === 'Tools' && <ComingSoon title="Device tools" description="A controlled shell, file transfer and reusable fix scripts are planned next." icon={Wrench} />}
      {section === 'Settings' && <ComingSoon title="Settings" description="ADB binary selection, console preferences and app configuration will live here." icon={Settings2} />}
    </>
  )
}
