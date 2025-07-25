interface LoadingScreenProps {
    isDark: boolean
  }
  
  export function LoadingScreen({ isDark }: LoadingScreenProps) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${
              isDark ? "border-white" : "border-gray-900"
            }`}
          ></div>
          <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Loading user dashboard...</p>
        </div>
      </div>
    )
  }
  