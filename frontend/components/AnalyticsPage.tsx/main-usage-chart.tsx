import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { CustomTooltip } from "./custom-tooltip"
import type { UsageData } from "./types"

interface Props {
  data: UsageData[]
  isDark: boolean
}

export function MainUsageChart({ data, isDark }: Props) {
  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 mb-8">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Usage Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
