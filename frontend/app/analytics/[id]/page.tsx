// app/analytics/[id]/page.tsx
import React from "react"
import AnalyticsClient from "../../../components/AnalyticsPage.tsx/AnalyticsClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params
  
  return <AnalyticsClient userId={id} />
}