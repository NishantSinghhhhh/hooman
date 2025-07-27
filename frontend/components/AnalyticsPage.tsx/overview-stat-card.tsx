import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, type LucideIcon } from "lucide-react"

interface Props {
  title: string
  value: string
  icon: LucideIcon
  color: "purple" | "blue" | "green" | "orange"
  subtitle?: string
  change?: string
  changeLabel?: string
  progress?: number
}

const colorClasses = {
  purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
}

export function OverviewStatCard({ title, value, icon: Icon, color, subtitle, change, changeLabel, progress }: Props) {
  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4">
          {change && changeLabel && (
            <div className="flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">{change}</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">{changeLabel}</span>
            </div>
          )}
          {subtitle && !change && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span>{subtitle}</span>
            </div>
          )}
          {progress !== undefined && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
