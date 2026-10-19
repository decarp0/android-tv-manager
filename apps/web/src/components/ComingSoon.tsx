import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ComingSoon({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="coming-soon">
      <div className="coming-icon"><Icon aria-hidden="true" /></div>
      <Badge variant="outline">PLANNED</Badge>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}
