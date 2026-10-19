import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <Card className="metric-card">
      <CardContent>
        <div className="metric-top"><span>{label}</span><Icon aria-hidden="true" /></div>
        <div className="metric-value">{value}</div>
        <div className="metric-detail">{detail}</div>
      </CardContent>
    </Card>
  )
}
