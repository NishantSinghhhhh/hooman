"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Square, 
  Play, 
  Pause, 
  Download, 
  Upload,
  Trash2,
  Settings,
  Volume2,
  VolumeX
} from "lucide-react"

interface MediaRecorderComponentProps {
  onRecordingComplete?: (blob: Blob, type: 'audio' | 'video') => void
  onUpload?: (file: File, type: 'audio' | 'video') => Promise<void>
  maxDuration?: number // in seconds
  className?: string
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'
type MediaType = 'audio' | 'video'

// Renamed component to avoid conflict with native MediaRecorder
export function CustomMediaRecorder({ 
  onRecordingComplete, 
  onUpload, 
  maxDuration = 300, // 5 minutes default
  className = "" 
}: MediaRecorderComponentProps) {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [mediaType, setMediaType] = useState<MediaType>('audio')
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  
  // Media streams and recorder
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [mediaRecorderInstance, setMediaRecorderInstance] = useState<MediaRecorder | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Permissions and device info
  const [hasPermissions, setHasPermissions] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  // Get available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then(stream => {
            // Stop the stream immediately, we just needed it for permissions
            stream.getTracks().forEach(track => track.stop())
          })
          .catch(() => {
            // It's okay if video fails, we still want to try audio
            return navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => {
                stream.getTracks().forEach(track => track.stop())
              })
              .catch(() => {
                console.log('No media permissions granted')
              })
          })

        const deviceList = await navigator.mediaDevices.enumerateDevices()
        console.log('Available devices:', deviceList)
        setDevices(deviceList)
        
        // Set default devices
        const audioDevice = deviceList.find(d => d.kind === 'audioinput')
        const videoDevice = deviceList.find(d => d.kind === 'videoinput')
        
        if (audioDevice) setSelectedAudioDevice(audioDevice.deviceId)
        if (videoDevice) setSelectedVideoDevice(videoDevice.deviceId)
        
        console.log('Selected devices:', {
          audio: audioDevice?.label || audioDevice?.deviceId,
          video: videoDevice?.label || videoDevice?.deviceId
        })
      } catch (error) {
        console.error('Error getting media devices:', error)
      }
    }
    
    getDevices()
  }, [])

  // Timer for recording duration
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [recordingState, maxDuration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaStream()
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, [recordedUrl])

  const stopMediaStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }
  }

  // Helper function to convert AudioBuffer to WAV Blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length
    const numberOfChannels = Math.min(buffer.numberOfChannels, 2) // Limit to stereo
    const sampleRate = buffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)
    
    // Helper to write ASCII string at offset
    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }
    
    // Write WAV header
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)       // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true)        // AudioFormat (1 for PCM)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true) // Byte rate
    view.setUint16(32, numberOfChannels * 2, true)              // Block align
    view.setUint16(34, 16, true)                                // Bits per sample
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Write PCM samples
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i]
        // Clamp float samples to [-1,1]
        const clamped = Math.max(-1, Math.min(1, sample))
        // Convert to 16-bit PCM (little endian)
        const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  // Convert audio blob to WAV
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const fileReader = new FileReader()
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Convert AudioBuffer to WAV Blob
          const wavBlob = audioBufferToWav(audioBuffer)
          resolve(wavBlob)
        } catch (error) {
          console.error('Error converting audio:', error)
          // Fallback to original blob
          resolve(blob)
        }
      }
      
      fileReader.onerror = () => {
        console.error('Error reading audio file')
        resolve(blob) // Fallback to original
      }
      
      fileReader.readAsArrayBuffer(blob)
    })
  }

  const requestPermissions = async (type: MediaType) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: type === 'audio' || type === 'video' ? {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 2,
          autoGainControl: true,
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
        } : false,
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          deviceId: selectedVideoDevice || undefined
        } : false
      }
  
      console.log(`Requesting ${type} permissions with constraints:`, constraints)
  
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // IMPORTANT: Check if audio tracks are actually capturing
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0]
        const settings = audioTrack.getSettings()
        console.log('Audio track settings:', settings)
        
        // Verify the track is enabled
        if (!audioTrack.enabled) {
          audioTrack.enabled = true
        }
      }
      
      setMediaStream(stream)
      setHasPermissions(true)
      
      // Display video preview
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
      }
      
      return stream
    } catch (error) {
      console.error('Error requesting media permissions:', error)
      alert(`Could not access ${type === 'video' ? 'camera/microphone' : 'microphone'}. Please check permissions.`)
      return null
    }
  }
  const startRecording = async () => {
    try {
      // Get media stream if not already available
      let stream = mediaStream
      if (!stream) {
        stream = await requestPermissions(mediaType)
        if (!stream) return
      }
  
      // CRITICAL: Verify audio is working before recording
      if (mediaType === 'audio' || mediaType === 'video') {
        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length === 0) {
          throw new Error('No audio tracks available')
        }
        
        // Test audio levels
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        microphone.connect(analyser)
        
        // Check if there's actual audio input
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        console.log('Audio level check:', average)
      }
  
      // Use better audio codec settings
      let mimeType: string = '' // Initialize with empty string
      const options: MediaRecorderOptions = {}
      
      if (mediaType === 'audio') {
        // Try different audio configurations
        const audioConfigs = [
          { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 },
          { mimeType: 'audio/webm', audioBitsPerSecond: 128000 },
          { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 128000 },
          { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 }
        ]
        
        for (const config of audioConfigs) {
          if (MediaRecorder.isTypeSupported(config.mimeType)) {
            mimeType = config.mimeType
            options.audioBitsPerSecond = config.audioBitsPerSecond
            break
          }
        }
        
        // Fallback if no supported type found
        if (!mimeType) {
          mimeType = 'audio/webm'
        }
      } else {
        // Video configuration
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus'
        } else {
          mimeType = 'video/webm'
        }
        options.videoBitsPerSecond = 2500000
        options.audioBitsPerSecond = 128000
      }
  
      console.log(`Using MIME type: ${mimeType} with options:`, options)
  
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        ...options 
      })
      
      // Reset chunks
      chunksRef.current = []
      
      // Collect data more frequently for better audio capture
      recorder.ondataavailable = (event: BlobEvent) => {
        console.log('Data available:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        console.log('Recording stopped, total chunks:', chunksRef.current.length)
        
        // Create blob with proper type
        const blob = new Blob(chunksRef.current, { type: mimeType })
        console.log('Final blob size:', blob.size, 'bytes, type:', blob.type)
        
        if (blob.size === 0) {
          console.error('Recording resulted in empty blob!')
          alert('Recording failed - no audio data captured')
          return
        }
        
        const url = URL.createObjectURL(blob)
        
        setRecordedBlob(blob)
        setRecordedUrl(url)
        
        // Callback to parent component
        if (onRecordingComplete) {
          onRecordingComplete(blob, mediaType)
        }
      }
  
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
      }
      
      // Start recording with smaller timeslice for audio
      recorder.start(100) // Collect data every 100ms
      setMediaRecorderInstance(recorder)
      setRecordingState('recording')
      setRecordingTime(0)
      
      console.log('Recording started successfully')
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert(`Failed to start ${mediaType} recording. ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderInstance && recordingState === 'recording') {
      mediaRecorderInstance.pause()
      setRecordingState('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderInstance && recordingState === 'paused') {
      mediaRecorderInstance.resume()
      setRecordingState('recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderInstance) {
      mediaRecorderInstance.stop()
      setRecordingState('stopped')
    }
    stopMediaStream()
  }

  const playRecording = () => {
    if (recordedUrl) {
      if (mediaType === 'video' && videoRef.current) {
        videoRef.current.src = recordedUrl
        videoRef.current.muted = isMuted
        videoRef.current.play()
        setIsPlaying(true)
      } else if (mediaType === 'audio' && audioRef.current) {
        audioRef.current.src = recordedUrl
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const pausePlayback = () => {
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.pause()
    } else if (mediaType === 'audio' && audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
  }

  // Convert audio blob to MP3
  const convertToMp3 = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const fileReader = new FileReader()
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Convert to WAV first (as MP3 encoding in browser is complex)
          const wavBlob = audioBufferToWav(audioBuffer)
          resolve(wavBlob)
        } catch (error) {
          console.error('Error converting audio:', error)
          // Fallback to original blob
          resolve(blob)
        }
      }
      
      fileReader.onerror = () => {
        console.error('Error reading audio file')
        resolve(blob) // Fallback to original
      }
      
      fileReader.readAsArrayBuffer(blob)
    })
  }

  const downloadRecording = async () => {
    if (!recordedBlob || !recordedUrl) return
    
    if (mediaType === 'audio') {
      setIsConverting(true)
      try {
        // Convert to WAV format (more compatible than WebM)
        const convertedBlob = await convertToWav(recordedBlob)
        const convertedUrl = URL.createObjectURL(convertedBlob)
        
        const a = document.createElement('a')
        a.href = convertedUrl
        a.download = `recording-${Date.now()}.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        // Clean up the temporary URL
        URL.revokeObjectURL(convertedUrl)
      } catch (error) {
        console.error('Error converting audio:', error)
        // Fallback to original format
        const a = document.createElement('a')
        a.href = recordedUrl
        a.download = `recording-${Date.now()}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } finally {
        setIsConverting(false)
      }
    } else {
      // Video download (keep as WebM)
      const a = document.createElement('a')
      a.href = recordedUrl
      a.download = `recording-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const uploadRecording = async () => {
    if (recordedBlob && onUpload) {
      setIsUploading(true)
      try {
        const file = new File(
          [recordedBlob], 
          `recording-${Date.now()}.${mediaType === 'video' ? 'webm' : 'webm'}`,
          { type: recordedBlob.type }
        )
        await onUpload(file, mediaType)
      } catch (error) {
        console.error('Error uploading recording:', error)
        alert('Failed to upload recording. Please try again.')
      } finally {
        setIsUploading(false)
      }
    }
  }

  const clearRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingState('idle')
    setRecordingTime(0)
    setIsPlaying(false)
    stopMediaStream()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Media Type Selection */}
      <div className="flex items-center gap-2">
        <Button
          variant={mediaType === 'audio' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMediaType('audio')}
          disabled={recordingState !== 'idle'}
        >
          <Mic className="w-4 h-4 mr-2" />
          Audio
        </Button>
        <Button
          variant={mediaType === 'video' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMediaType('video')}
          disabled={recordingState !== 'idle'}
        >
          <Video className="w-4 h-4 mr-2" />
          Video
        </Button>
      </div>

      {/* Recording Interface */}
      <Card>
        <CardContent className="p-6">
          {/* Video Preview/Playback */}
          {mediaType === 'video' && (
            <div className="mb-4">
              <video
                ref={videoRef}
                className="w-full max-w-md mx-auto rounded-lg bg-gray-100 dark:bg-gray-800"
                autoPlay
                playsInline
                onEnded={() => setIsPlaying(false)}
              />
              {mediaType === 'video' && (recordedUrl || mediaStream) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="mt-2"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              )}
            </div>
          )}

          {/* Audio Preview/Recording Indicator */}
          {mediaType === 'audio' && (
            <div className="mb-4">
              {recordingState === 'recording' && (
                <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="text-lg font-medium">Recording Audio...</div>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 bg-red-500 rounded-full animate-pulse"
                          style={{
                            height: Math.random() * 20 + 10,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show audio element when recording is available */}
              {recordedUrl && (
                <audio
                  ref={audioRef}
                  className="w-full max-w-md mx-auto"
                  controls
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>
          )}

          {/* Recording Status */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge 
                variant={recordingState === 'recording' ? 'destructive' : 'secondary'}
                className={recordingState === 'recording' ? 'animate-pulse' : ''}
              >
                {recordingState === 'recording' && <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />}
                {recordingState.charAt(0).toUpperCase() + recordingState.slice(1)}
              </Badge>
              <span className="text-lg font-mono">
                {formatTime(recordingTime)}
              </span>
              <span className="text-sm text-gray-500">
                / {formatTime(maxDuration)}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {recordingState === 'idle' && (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700">
                {mediaType === 'video' ? <Video className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                Start Recording
              </Button>
            )}

            {recordingState === 'recording' && (
              <>
                <Button onClick={pauseRecording} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {recordingState === 'paused' && (
              <>
                <Button onClick={resumeRecording} className="bg-red-600 hover:bg-red-700">
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {recordingState === 'stopped' && recordedBlob && (
              <>
                <Button onClick={playRecording} disabled={isPlaying}>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
                <Button onClick={pausePlayback} disabled={!isPlaying}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={downloadRecording} variant="outline" disabled={isConverting}>
                  <Download className="w-4 h-4 mr-2" />
                  {isConverting ? 'Converting...' : `Download ${mediaType === 'audio' ? 'WAV' : 'WebM'}`}
                </Button>

                <Button onClick={clearRecording} variant="outline">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
          </div>

          {/* Device Selection */}
          {devices.length > 0 && recordingState === 'idle' && (
            <div className="mt-4 pt-4 border-t">
              <details className="text-sm">
                <summary className="cursor-pointer flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4" />
                  Device Settings
                </summary>
                <div className="space-y-2 ml-6">
                  {/* Audio Device Selection */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Microphone:</label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="w-full p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      {devices
                        .filter(device => device.kind === 'audioinput')
                        .map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Video Device Selection */}
                  {mediaType === 'video' && (
                    <div>
                      <label className="block text-xs font-medium mb-1">Camera:</label>
                      <select
                        value={selectedVideoDevice}
                        onChange={(e) => setSelectedVideoDevice(e.target.value)}
                        className="w-full p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        {devices
                          .filter(device => device.kind === 'videoinput')
                          .map(device => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Export with the original name for backward compatibility
export { CustomMediaRecorder as MediaRecorder }