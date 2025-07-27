import { Calendar, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AnalyticsHeader() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your API usage across different modalities</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="px-3 py-1">
          <Calendar className="w-4 h-4 mr-2" />
          Jul 12 - Jul 27, 2025
        </Badge>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  )
}
