import { ModalityCard } from "./modality-card"
import type { ModalityStat } from "./types"

interface Props {
  stats: ModalityStat[]
}

export function ModalityBreakdown({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {stats.map((stat, index) => (
        <ModalityCard key={index} stat={stat} />
      ))}
    </div>
  )
}
