"use client"

import type React from "react"

import { useState } from "react"

interface FileUploadProps {
  isDark: boolean
  selectedFiles: File[]
  onFilesChange: (files: File[]) => void
}

export function FileUpload({ isDark, selectedFiles, onFilesChange }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    onFilesChange([...selectedFiles, ...files])
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    const files = Array.from(event.dataTransfer.files)
    onFilesChange([...selectedFiles, ...files])
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const removeFile = (index: number) => {
    onFilesChange(selectedFiles.filter((_, i) => i !== index))
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "🖼️"
    if (fileType.startsWith("audio/")) return "🎵"
    if (fileType.startsWith("video/")) return "📹"
    if (fileType.includes("pdf")) return "📄"
    return "📎"
  }

  return (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
        Upload Files
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? isDark
              ? "border-gray-400 bg-gray-700"
              : "border-blue-400 bg-blue-50"
            : isDark
              ? "border-gray-600 hover:border-gray-500"
              : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          multiple
          accept=".mp3,.wav,.mp4,.mov,.png,.jpg,.jpeg,.pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-2">
            <svg
              className={`mx-auto h-12 w-12 ${isDark ? "text-gray-400" : "text-gray-400"}`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className={isDark ? "text-gray-300" : "text-gray-600"}>
                <span className={`font-medium hover:underline ${isDark ? "text-gray-200" : "text-blue-600"}`}>
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Audio (.mp3, .wav), Video (.mp4, .mov), Images (.png, .jpg), Documents (.pdf, .txt, .doc)
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                isDark ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getFileIcon(file.type)}</span>
                <span className={`text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>{file.name}</span>
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className={`ml-2 hover:opacity-75 ${isDark ? "text-red-400" : "text-red-500"}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
