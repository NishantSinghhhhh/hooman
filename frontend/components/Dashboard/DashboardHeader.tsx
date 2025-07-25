interface DashboardHeaderProps {
    isDark: boolean
    userId: string
    session: any
    onSignOut: () => void
  }
  
  export function DashboardHeader({ isDark, userId, session, onSignOut }: DashboardHeaderProps) {
    return (
      <header className={`shadow transition-colors ${isDark ? "bg-gray-800 border-gray-700" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                  isDark ? "bg-white text-gray-900" : "bg-gray-900 text-white"
                }`}
              >
                <span className="font-bold text-lg">AI</span>
              </div>
              <div>
                <h1 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Multimodal AI Dashboard
                </h1>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>ID: {userId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Logged in as:</p>
                <p className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>{session.user?.name}</p>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{session.user?.email}</p>
              </div>
              <button
                onClick={onSignOut}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
    )
  }
  