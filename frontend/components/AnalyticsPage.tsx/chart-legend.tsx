export function ChartLegend() {
    const legendItems = [
      { color: "bg-purple-500", label: "Video" },
      { color: "bg-blue-500", label: "Audio" },
      { color: "bg-green-500", label: "Documents" },
      { color: "bg-orange-500", label: "Images" },
    ]
  
    return (
      <div className="flex items-center justify-center gap-6 mt-6">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
    )
  }
  