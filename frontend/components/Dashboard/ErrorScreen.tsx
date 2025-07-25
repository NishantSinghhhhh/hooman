interface ErrorScreenProps {
    error: string
    isDark: boolean
    onGoBack: () => void
  }
  
  export function ErrorScreen({ error, isDark, onGoBack }: ErrorScreenProps) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <div
            className={`border px-6 py-4 rounded-lg mb-4 ${
              isDark ? "bg-red-900/20 border-red-800 text-red-400" : "bg-red-100 border-red-400 text-red-700"
            }`}
          >
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={onGoBack}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            Go to Main Dashboard
          </button>
        </div>
      </div>
    )
  }
  