interface Props {
    isDark: boolean
    active?: boolean
    payload?: any[]
    label?: string
  }
  
  export function CustomTooltip({ isDark, active, payload, label }: Props) {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-3 rounded-lg shadow-lg border"
          style={{
            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
            borderColor: isDark ? "#374151" : "#E5E7EB",
          }}
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  