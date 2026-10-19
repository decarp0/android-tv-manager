import { Check, LoaderCircle, RefreshCw, RotateCcw } from 'lucide-react'
import type { HistoryEntry } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTime } from '@/lib/console-utils'
import { PageHeading } from '@/components/PageHeading'

export function HistoryPage({
  busy,
  history,
  onRefresh,
  onUndo,
  ready,
  serial,
}: {
  busy: string
  history: HistoryEntry[]
  onRefresh: () => void
  onUndo: (entry: HistoryEntry) => void
  ready: boolean
  serial: string
}) {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="CHANGE CONTROL" title="Action history" description="Reverse package changes made from this console." />
      <Card>
        <div className="table-toolbar">
          <div><div className="toolbar-title">Recent package changes</div><div className="toolbar-caption">Saved locally on this Mac</div></div>
          <Button disabled={!serial} onClick={onRefresh} size="sm" variant="outline"><RefreshCw data-icon="inline-start" />Refresh</Button>
        </div>
        <div className="table-card-content">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Package</TableHead><TableHead>Change</TableHead><TableHead>Previous state</TableHead><TableHead className="text-right">Undo</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...history].reverse().map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatTime(entry.ts)}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.packageName}</TableCell>
                  <TableCell><Badge variant="outline">{entry.action === 'uninstall' ? 'Uninstall for user' : entry.action}</Badge></TableCell>
                  <TableCell>{entry.previousState}</TableCell>
                  <TableCell className="text-right">
                    {entry.undone ? <Badge variant="secondary"><Check data-icon="inline-start" />Undone</Badge> : (
                      <Button disabled={busy === entry.id || !ready} onClick={() => onUndo(entry)} size="sm" variant="outline">
                        {busy === entry.id ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
                        Restore
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && <TableRow><TableCell className="empty-table" colSpan={5}>No package changes have been recorded for this device.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
