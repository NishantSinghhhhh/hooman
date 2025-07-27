import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, AreaChart, Area } from "recharts"
import type { ModalityStat } from "./types"

interface Props {
  stat: ModalityStat
}

export function ModalityCard({ stat }: Props) {
  const Icon = stat.icon

  const getStrokeColor = (color: string) => {
    if (color.includes("purple")) return "#8B5CF6"
    if (color.includes("blue")) return "#3B82F6"
    if (color.includes("green")) return "#10B981"
    return "#F59E0B"
  }

  const strokeColor = getStrokeColor(stat.color)

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900 dark:text-white">{stat.name}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.requests} requests</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-900/20">
            {stat.change}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</p>
            <div className="h-16 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stat.trend.map((value, i) => ({ value, index: i }))}>
                  <Area type="monotone" dataKey="value" stroke={strokeColor} fill={strokeColor} fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
