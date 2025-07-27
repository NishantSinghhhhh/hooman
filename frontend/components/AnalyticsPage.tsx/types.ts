import type { LucideIcon } from "lucide-react"

export interface UsageData {
  date: string
  video: number
  audio: number
  docs: number
  image: number
  total: number
}

export interface ModalityStat {
  name: string
  value: string
  change: string
  icon: LucideIcon
  color: string
  bgColor: string
  requests: number
  trend: number[]
}
