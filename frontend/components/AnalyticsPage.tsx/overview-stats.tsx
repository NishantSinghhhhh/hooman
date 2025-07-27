import { OverviewStatCard } from "./overview-stat-card"
import { DollarSign, Activity, TrendingUp } from "lucide-react"
import type { ModalityStat } from "./types"

interface Props {
  modalityStats: ModalityStat[]
}

export function OverviewStats({ modalityStats }: Props) {
  const totalTokens = modalityStats.reduce(
    (sum, stat) => sum + Number.parseFloat(stat.value.replace("K", "")) * 1000,
    0,
  )

  const overviewData = [
    {
      title: "Total Spend",
      value: "$0.55",
      icon: DollarSign,
      color: "purple",
      subtitle: "Budget: $0.63 / $120",
      progress: 0.5,
    },
    {
      title: "Total Tokens",
      value: `${(totalTokens / 1000).toFixed(1)}K`,
      icon: Activity,
      color: "blue",
      change: "+12.5%",
      changeLabel: "vs last period",
    },
    {
      title: "Total Requests",
      value: "436",
      icon: Activity,
      color: "green",
      change: "+8.3%",
      changeLabel: "this week",
    },
    {
      title: "Avg Daily Usage",
      value: "8.2K",
      icon: TrendingUp,
      color: "orange",
      subtitle: "tokens per day",
    },
  ] as const
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {overviewData.map((stat, index) => (
        <OverviewStatCard key={index} {...stat} />
      ))}
    </div>
  )
}
