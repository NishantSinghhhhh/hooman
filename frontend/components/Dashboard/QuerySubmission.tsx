"use client"

import { useState } from "react"
import { FileUpload } from "./FileUpload"
import type { QueryHistory } from "./types"

interface QuerySubmissionProps {
  isDark: boolean
  userId: string
  session: any
  onQueryAdded: (query: QueryHistory) => void
  onQueryUpdated: (queryId: string, updates: Partial<QueryHistory>) => void
}

export function QuerySubmission({ isDark, userId, session, onQueryAdded, onQueryUpdated }: QuerySubmissionProps) {
  const [textQuery, setTextQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getQueryType = (files: File[]): "text" | "image" | "audio" | "video" | "document" => {
    if (files.length === 0) return "text"
    const file = files[0]
    if (file.type.startsWith("image/")) return "image"
    if (file.type.startsWith("audio/")) return "audio"
    if (file.type.startsWith("video/")) return "video"
    return "document"
  }

  const submitQuery = async () => {
    if (!textQuery.trim() && selectedFiles.length === 0) {
      alert("Please enter a query or upload a file");
      return;
    }

    setIsSubmitting(true);
    
    // Generate temporary frontend ID for immediate UI feedback
    const frontendQueryId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to history immediately with processing status
    const newQuery: QueryHistory = {
      id: frontendQueryId,
      type: getQueryType(selectedFiles),
      query: textQuery || "File analysis",
      fileName: selectedFiles[0]?.name || '',
      response: "Processing your request...",
      timestamp: new Date().toISOString(),
      status: "processing",
    };
    
    onQueryAdded(newQuery);

    try {
      // Get user ID and token from session
      const sessionUserId = (session as any)?.user?.id || (session as any)?.userId;
      const token = (session as any)?.backendToken;

      // Validate authentication
      if (!sessionUserId || !token) {
        onQueryUpdated(frontendQueryId, {
          status: "error",
          response: "Authentication error: Unable to get user session. Please log in again.",
        });
        setIsSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append("userId", sessionUserId);
      formData.append("textQuery", textQuery);

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/query/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      console.log("📨 Backend Response:", result);

      if (response.ok && result.success) {
        console.log("✅ Query processed successfully");
        
        // Update the query with the complete result from backend
        onQueryUpdated(frontendQueryId, {
          status: "completed",
          response: result, // Pass the entire result object which contains the MCP backend response
          type: result.classification?.agentType || getQueryType(selectedFiles),
        });
        
        // Clear form
        setTextQuery("");
        setSelectedFiles([]);
      } else {
        console.error("❌ Query submission failed:", result);
        onQueryUpdated(frontendQueryId, {
          status: "error",
          response: result.error || "Failed to submit query",
        });
      }
    } catch (error) {
      console.error("❌ Error submitting query:", error);
      onQueryUpdated(frontendQueryId, {
        status: "error",
        response: "Network error occurred while submitting query",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-lg shadow-lg border transition-colors ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Submit Multimodal Query</h2>
        <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Upload images, audio, video, documents, or enter text to query our AI system
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Text Input */}
        <div>
          <label
            htmlFor="query"
            className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Text Query
          </label>
          <textarea
            id="query"
            rows={4}
            className={`w-full px-3 py-2 rounded-lg border transition-colors resize-none ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-900"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDark ? "focus:ring-gray-400" : "focus:ring-gray-900"
            }`}
            placeholder="Enter your question or describe what you're looking for..."
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
          />
        </div>

        <FileUpload isDark={isDark} selectedFiles={selectedFiles} onFilesChange={setSelectedFiles} />

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={submitQuery}
            disabled={isSubmitting || (!textQuery.trim() && selectedFiles.length === 0)}
            className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              isDark
                ? "bg-white text-gray-900 hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400"
                : "bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400"
            } disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Submit Query
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}