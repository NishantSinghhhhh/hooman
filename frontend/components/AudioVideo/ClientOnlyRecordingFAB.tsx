// components/ClientOnlyRecordingFAB.tsx - Client wrapper to avoid hydration issues
"use client"

import dynamic from 'next/dynamic'

const DynamicGlobalRecordingFAB = dynamic(
  () => import('./GlobalRecordingFAB').then(mod => ({ default: mod.GlobalRecordingFAB })),
  { 
    ssr: false,
    loading: () => null
  }
)

export function ClientOnlyRecordingFAB() {
  return <DynamicGlobalRecordingFAB />
}