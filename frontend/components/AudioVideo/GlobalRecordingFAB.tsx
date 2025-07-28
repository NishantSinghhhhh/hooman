// components/GlobalRecordingFAB.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { CustomMediaRecorder } from './AudioVideo' // Updated import
import { 
  Mic, 
  Video, 
  X, 
  Plus,
  Upload,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface GlobalRecordingFABProps {
  className?: string
}

export function GlobalRecordingFAB({ className = "" }: GlobalRecordingFABProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const params = useParams()
  
  const [isOpen, setIsOpen] = useState(false)
  const [recordingType, setRecordingType] = useState<'audio' | 'video'>('audio')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  // Get user ID from URL params (assuming it's in the route)
  const userId = params.id as string || (session as any)?.user?.id

  // Don't show on login/auth pages
  const shouldHide = pathname.includes('/login') || 
                    pathname.includes('/register') || 
                    pathname.includes('/auth') ||
                    !session ||
                    !userId

  // Handle upload to backend
  const handleUpload = async (file: File, type: 'audio' | 'video') => {
    setIsUploading(true)
    setUploadStatus('idle')
    setUploadMessage('Uploading recording...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)
      formData.append('query', `${type} analysis`)
      formData.append('mode', 'full')

      const endpoint = type === 'audio' ? 'process-audio' : 'process-video'
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'

      const response = await fetch(`${backendUrl}/${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      setUploadStatus('success')
      setUploadMessage(`${type} uploaded and processed successfully!`)
      
      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false)
        setUploadStatus('idle')
        setUploadMessage('')
      }, 3000)

      // Trigger page refresh or custom event to update data
      window.dispatchEvent(new CustomEvent('recordingUploaded', { 
        detail: { type, result } 
      }))

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed')
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadMessage('')
      }, 5000)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle recording completion
  const handleRecordingComplete = (blob: Blob, type: 'audio' | 'video') => {
    console.log(`Recording completed: ${type}, size: ${blob.size} bytes`)
  }

  // Don't render if should be hidden
  if (shouldHide) {
    return null
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          <div className="relative">
            {/* Main FAB */}
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              <Plus className="h-6 w-6" />
            </Button>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Record Audio/Video
            </div>
          </div>
        </div>
      )}

      {/* Recording Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  setUploadStatus('idle')
                  setUploadMessage('')
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Status */}
            {uploadMessage && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  {isUploading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-blue-600" />
                  )}
                  {uploadStatus === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {uploadStatus === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm ${
                    uploadStatus === 'success' ? 'text-green-600' : 
                    uploadStatus === 'error' ? 'text-red-600' : 
                    'text-blue-600'
                  }`}>
                    {uploadMessage}
                  </span>
                </div>
              </div>
            )}

            {/* Recording Interface */}
            <div className="p-4">
              <CustomMediaRecorder
                onRecordingComplete={handleRecordingComplete}
                onUpload={handleUpload}
                maxDuration={300} // 5 minutes
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

