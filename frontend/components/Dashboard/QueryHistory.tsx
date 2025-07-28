import type { QueryHistory as QueryHistoryType } from "./types"
import { useState } from "react"

interface QueryHistoryProps {
  isDark: boolean
  queryHistory: QueryHistoryType[]
}

// Component to format text and handle markdown-like formatting
function FormattedText({ text, isDark }: { text: string, isDark: boolean }) {
  if (!text) return null;

  // Function to process the text and convert markdown-like formatting
  const formatText = (inputText: string) => {
    // Split by lines to maintain structure
    const lines = inputText.split('\n');
    
    return lines.map((line, index) => {
      // Handle bold text (**text**)
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold text-blue-600 dark:text-blue-400">$1</span>');
      
      // Handle numbered lists (1. 2. 3. etc.)
      const isNumberedList = /^\d+\.\s/.test(line.trim());
      
      // Handle bullet points (- or *)
      const isBulletPoint = /^[\s]*[-*]\s/.test(line);
      
      if (isNumberedList) {
        return (
          <div key={index} className="mb-3 pl-4">
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formattedLine }} 
            />
          </div>
        );
      } else if (isBulletPoint) {
        return (
          <div key={index} className="mb-2 pl-6">
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formattedLine }} 
            />
          </div>
        );
      } else if (formattedLine.trim() === '') {
        return <div key={index} className="mb-2" />;
      } else {
        return (
          <div key={index} className="mb-2">
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formattedLine }} 
            />
          </div>
        );
      }
    });
  };

  return (
    <div className="leading-relaxed">
      {formatText(text)}
    </div>
  );
}

// Component to render rich results
function ResultDisplay({ result, isDark }: { result: any, isDark: boolean }) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'enhanced' | 'technical'>('analysis')
  
  if (!result || typeof result === 'string') {
    return (
      <div className={`mt-1 p-3 rounded-lg text-sm ${
        isDark ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-800"
      }`}>
        {result || "Processing..."}
      </div>
    )
  }

  // Handle the nested structure from your backend response
  const mcpResult = result.result?.result || result.result || result
  
  // Check if we have the analysis data
  const hasPrimaryAnalysis = mcpResult?.primary_analysis
  const hasEnhancedResponse = mcpResult?.enhanced_response
  const hasTechnicalDetails = mcpResult?.technical_details

  // If no analysis data, show a simple message
  if (!hasPrimaryAnalysis && !hasEnhancedResponse && !hasTechnicalDetails) {
    return (
      <div className={`mt-1 p-3 rounded-lg text-sm ${
        isDark ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-800"
      }`}>
        {result.message || "Query completed successfully"}
      </div>
    )
  }

  return (
    <div className="mt-2">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-3">
        {hasPrimaryAnalysis && (
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'analysis'
                ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Analysis
          </button>
        )}
        {hasEnhancedResponse && (
          <button
            onClick={() => setActiveTab('enhanced')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'enhanced'
                ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Enhanced
          </button>
        )}
        {hasTechnicalDetails && (
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'technical'
                ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Technical
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className={`p-4 rounded-lg text-sm max-h-96 overflow-y-auto ${
        isDark ? "bg-gray-700" : "bg-gray-50"
      }`}>
        {activeTab === 'analysis' && hasPrimaryAnalysis && (
          <div className={`${isDark ? "text-gray-200" : "text-gray-800"}`}>
            <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Primary Analysis</h4>
            <div className="whitespace-pre-wrap leading-relaxed">
              <FormattedText text={mcpResult.primary_analysis} isDark={isDark} />
            </div>
          </div>
        )}

        {activeTab === 'enhanced' && hasEnhancedResponse && (
          <div className={`${isDark ? "text-gray-200" : "text-gray-800"}`}>
            <h4 className="font-medium mb-2 text-green-600 dark:text-green-400">Enhanced Response</h4>
            <div className="whitespace-pre-wrap leading-relaxed">
              <FormattedText text={mcpResult.enhanced_response} isDark={isDark} />
            </div>
          </div>
        )}

        {activeTab === 'technical' && hasTechnicalDetails && (
          <div className={`${isDark ? "text-gray-200" : "text-gray-800"}`}>
            <h4 className="font-medium mb-3 text-purple-600 dark:text-purple-400">Technical Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {mcpResult.technical_details.model_used && (
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <span className={`font-medium block mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Model:</span>
                  <div className="font-mono">{mcpResult.technical_details.model_used}</div>
                </div>
              )}
              {mcpResult.technical_details.tokens_used && (
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <span className={`font-medium block mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Tokens:</span>
                  <div className="font-mono">{mcpResult.technical_details.tokens_used.toLocaleString()}</div>
                </div>
              )}
              {mcpResult.technical_details.processing_time && (
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <span className={`font-medium block mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Processing Time:</span>
                  <div className="font-mono">{mcpResult.technical_details.processing_time}</div>
                </div>
              )}
              {result.processing_time && (
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <span className={`font-medium block mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Total Time:</span>
                  <div className="font-mono">{Math.round(result.processing_time)}ms</div>
                </div>
              )}
              {mcpResult.technical_details.enhancement_agents?.length && (
                <div className={`p-3 rounded-lg col-span-full ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <span className={`font-medium block mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Enhancement Agents:</span>
                  <div className="flex flex-wrap gap-2">
                    {mcpResult.technical_details.enhancement_agents.map((agent: string, idx: number) => (
                      <span key={idx} className={`px-2 py-1 rounded-full text-xs font-mono ${
                        isDark ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-700"
                      }`}>
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Classification Info */}
      {result.classification && (
        <div className={`mt-3 p-3 rounded-lg text-xs ${
          isDark ? "bg-gray-800 text-gray-300" : "bg-blue-50 text-blue-800"
        }`}>
          <h5 className="font-medium mb-2">Classification</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="font-medium">Type:</span> {result.classification.agentType}
            </div>
            <div>
              <span className="font-medium">Priority:</span> {result.classification.priority}
            </div>
            <div>
              <span className="font-medium">Confidence:</span> {Math.round(result.classification.confidence * 100)}%
            </div>
            <div>
              <span className="font-medium">Files:</span> {result.classification.fileCount}
            </div>
          </div>
          <div className="mt-2">
            <span className="font-medium">Reasoning:</span> {result.classification.reasoning}
          </div>
        </div>
      )}

      {/* File Info (if available) */}
      {mcpResult?.image_info && (
        <div className={`mt-3 p-3 rounded-lg text-xs ${
          isDark ? "bg-gray-800 text-gray-300" : "bg-green-50 text-green-800"
        }`}>
          <h5 className="font-medium mb-2">File Information</h5>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="font-medium">Filename:</span> 
              <div className="font-mono text-xs mt-1">{mcpResult.image_info.filename}</div>
            </div>
            <div>
              <span className="font-medium">Type:</span> 
              <div className="font-mono text-xs mt-1">{mcpResult.image_info.mime_type}</div>
            </div>
            <div>
              <span className="font-medium">Size:</span> 
              <div className="font-mono text-xs mt-1">{(mcpResult.image_info.file_size / 1024).toFixed(1)}KB</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Info */}
      {mcpResult?.status && (
        <div className={`mt-2 flex flex-wrap gap-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          <span className={`px-2 py-1 rounded ${
            mcpResult.status.openai_analysis === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            Analysis: {mcpResult.status.openai_analysis}
          </span>
          <span className={`px-2 py-1 rounded ${
            mcpResult.status.crew_enhancement === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            Enhancement: {mcpResult.status.crew_enhancement}
          </span>
          <span className={`px-2 py-1 rounded ${
            mcpResult.status.overall === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            Overall: {mcpResult.status.overall}
          </span>
        </div>
      )}
    </div>
  )
}

export function QueryHistory({ isDark, queryHistory }: QueryHistoryProps) {
  return (
    <div
      className={`rounded-lg shadow-lg border transition-colors ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className={`px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Query History</h2>
        <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Your recent multimodal queries and AI responses
        </p>
      </div>

      <div className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
        {queryHistory.length === 0 ? (
          <div className="p-6 text-center">
            <svg
              className={`mx-auto h-12 w-12 ${isDark ? "text-gray-500" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No queries yet. Submit your first multimodal query above!
            </p>
          </div>
        ) : (
          queryHistory.map((query) => (
            <div key={query.id} className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      query.type === "text"
                        ? "bg-blue-500"
                        : query.type === "image"
                          ? "bg-green-500"
                          : query.type === "audio"
                            ? "bg-purple-500"
                            : query.type === "video"
                              ? "bg-red-500"
                              : "bg-gray-500"
                    }`}
                  >
                    {query.type === "text"
                      ? "T"
                      : query.type === "image"
                        ? "🖼️"
                        : query.type === "audio"
                          ? "🎵"
                          : query.type === "video"
                            ? "📹"
                            : "📄"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-medium capitalize ${isDark ? "text-white" : "text-gray-900"}`}>
                      {query.type} Query
                      {query.fileName && (
                        <span className={`ml-2 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          • {query.fileName}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          query.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : query.status === "processing"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {query.status === "processing" && (
                          <svg
                            className="animate-spin -ml-1 mr-1 h-3 w-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        )}
                        {query.status}
                      </span>
                      <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {new Date(query.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>Query:</p>
                      <p className={`text-sm mt-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                        {query.query || "File analysis"}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        AI Response:
                      </p>
                      <ResultDisplay result={query.response} isDark={isDark} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}