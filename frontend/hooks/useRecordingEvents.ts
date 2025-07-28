// hooks/useRecordingEvents.ts
import { useEffect } from 'react'

interface RecordingEventDetail {
  type: 'audio' | 'video'
  result: any
}

interface UseRecordingEventsOptions {
  onRecordingUploaded?: (detail: RecordingEventDetail) => void
}

export function useRecordingEvents({ onRecordingUploaded }: UseRecordingEventsOptions = {}) {
  useEffect(() => {
    const handleRecordingUploaded = (event: CustomEvent<RecordingEventDetail>) => {
      console.log('Recording uploaded:', event.detail)
      if (onRecordingUploaded) {
        onRecordingUploaded(event.detail)
      }
    }

    // Listen for global recording upload events
    window.addEventListener('recordingUploaded', handleRecordingUploaded as EventListener)

    return () => {
      window.removeEventListener('recordingUploaded', handleRecordingUploaded as EventListener)
    }
  }, [onRecordingUploaded])
}