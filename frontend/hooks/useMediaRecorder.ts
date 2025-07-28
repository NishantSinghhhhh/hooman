import { useState, useRef, useCallback, useEffect } from 'react'

interface UseMediaRecorderOptions {
  maxDuration?: number
  onRecordingComplete?: (blob: Blob, type: 'audio' | 'video') => void
  mimeType?: string
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const { maxDuration = 300, onRecordingComplete, mimeType } = options
  
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxDuration) {
          stopRecording()
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }, [maxDuration])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async (
    constraints: MediaStreamConstraints,
    mediaType: 'audio' | 'video' = 'audio'
  ) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      // Determine mime type
      let finalMimeType = mimeType
      if (!finalMimeType) {
        finalMimeType = mediaType === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus'
        if (!MediaRecorder.isTypeSupported(finalMimeType)) {
          finalMimeType = mediaType === 'video' ? 'video/webm' : 'audio/webm'
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: finalMimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: finalMimeType })
        const url = URL.createObjectURL(blob)
        
        setRecordedBlob(blob)
        setRecordedUrl(url)
        
        if (onRecordingComplete) {
          onRecordingComplete(blob, mediaType)
        }
      }

      recorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)
      startTimer()
      
      return stream
    } catch (error) {
      console.error('Error starting recording:', error)
      throw error
    }
  }, [mimeType, onRecordingComplete, startTimer])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      stopTimer()
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [isRecording, stopTimer])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      stopTimer()
    }
  }, [isRecording, stopTimer])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      startTimer()
    }
  }, [isPaused, startTimer])

  const clearRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingTime(0)
  }, [recordedUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, [recordedUrl, stopTimer])

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordedBlob,
    recordedUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    mediaStream: streamRef.current
  }
}