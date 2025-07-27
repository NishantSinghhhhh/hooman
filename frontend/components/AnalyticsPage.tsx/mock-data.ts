import { Video, Headphones, FileText, ImageIcon } from "lucide-react"
import type { UsageData, ModalityStat } from "./types"

export const usageData: UsageData[] = [
  { date: "Jul 12", video: 45, audio: 32, docs: 28, image: 15, total: 120 },
  { date: "Jul 15", video: 52, audio: 38, docs: 35, image: 22, total: 147 },
  { date: "Jul 18", video: 38, audio: 45, docs: 42, image: 18, total: 143 },
  { date: "Jul 21", video: 65, audio: 28, docs: 38, image: 25, total: 156 },
  { date: "Jul 24", video: 48, audio: 55, docs: 32, image: 28, total: 163 },
  { date: "Jul 27", video: 72, audio: 42, docs: 45, image: 35, total: 194 },
]

export const modalityStats: ModalityStat[] = [
  {
    name: "Video Tokens",
    value: "45.2K",
    change: "+12.5%",
    icon: Video,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    requests: 156,
    trend: [20, 25, 30, 28, 35, 45],
  },
  {
    name: "Audio Tokens",
    value: "32.8K",
    change: "+8.3%",
    icon: Headphones,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    requests: 124,
    trend: [15, 20, 18, 25, 30, 32],
  },
  {
    name: "Document Tokens",
    value: "28.5K",
    change: "+15.2%",
    icon: FileText,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    requests: 89,
    trend: [10, 15, 20, 22, 25, 28],
  },
  {
    name: "Image Tokens",
    value: "18.9K",
    change: "+5.7%",
    icon: ImageIcon,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    requests: 67,
    trend: [8, 12, 15, 16, 18, 19],
  },
]
