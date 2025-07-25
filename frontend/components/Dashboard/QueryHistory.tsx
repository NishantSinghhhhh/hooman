import type { QueryHistory as QueryHistoryType } from "./types"

interface QueryHistoryProps {
  isDark: boolean
  queryHistory: QueryHistoryType[]
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
                      <p className={`text-sm mt-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{query.query}</p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        AI Response:
                      </p>
                      <div
                        className={`mt-1 p-3 rounded-lg text-sm ${
                          query.status === "completed"
                            ? isDark
                              ? "bg-gray-700 text-gray-200"
                              : "bg-gray-50 text-gray-800"
                            : query.status === "processing"
                              ? "bg-yellow-50 text-yellow-800"
                              : "bg-red-50 text-red-800"
                        }`}
                      >
                        {query.response}
                      </div>
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
