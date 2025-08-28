import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#e5e7eb',
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#f9fafb',
      bodyColor: '#e5e7eb',
      borderColor: '#374151',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#9ca3af'
      },
      grid: {
        color: '#374151'
      }
    },
    y: {
      ticks: {
        color: '#9ca3af'
      },
      grid: {
        color: '#374151'
      }
    }
  }
}

// Revenue Trend Chart
export const RevenueTrendChart = ({ data, timeRange }) => {
  const labels = data.map(item => {
    const date = new Date(item.date)
    if (timeRange === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else if (timeRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' })
    }
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue ($)',
        data: data.map(item => item.revenue),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: 'Revenue Trend',
        color: '#f9fafb',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales.y,
        beginAtZero: true,
        ticks: {
          ...defaultChartOptions.scales.y.ticks,
          callback: function(value) {
            return '$' + value.toFixed(2)
          }
        }
      }
    }
  }

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  )
}

// Clicks vs Conversions Chart
export const ClicksConversionsChart = ({ data, timeRange }) => {
  const labels = data.map(item => {
    const date = new Date(item.date)
    if (timeRange === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else if (timeRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' })
    }
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Clicks',
        data: data.map(item => item.clicks),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1
      },
      {
        label: 'Conversions',
        data: data.map(item => item.conversions),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: '#8b5cf6',
        borderWidth: 1
      }
    ]
  }

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: 'Clicks vs Conversions',
        color: '#f9fafb',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales.y,
        beginAtZero: true
      }
    }
  }

  return (
    <div className="h-80">
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Conversion Rate Chart
export const ConversionRateChart = ({ data, timeRange }) => {
  const labels = data.map(item => {
    const date = new Date(item.date)
    if (timeRange === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else if (timeRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' })
    }
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Conversion Rate (%)',
        data: data.map(item => item.conversionRate),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: 'Conversion Rate Trend',
        color: '#f9fafb',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales.y,
        beginAtZero: true,
        max: 100,
        ticks: {
          ...defaultChartOptions.scales.y.ticks,
          callback: function(value) {
            return value + '%'
          }
        }
      }
    }
  }

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  )
}

// Top Links Performance Chart
export const TopLinksChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">📊</span>
          </div>
          <p className="text-gray-400">No link data available</p>
          <p className="text-gray-500 text-sm">Create some links to see performance</p>
        </div>
      </div>
    )
  }

  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ]

  const chartData = {
    labels: data.map(item => item.name || `Link ${item.id?.slice(0, 8) || ''}`),
    datasets: [
      {
        data: data.map(item => item.revenue || 0),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color),
        borderWidth: 2
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#e5e7eb',
          font: {
            size: 12
          },
          generateLabels: function(chart) {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, index) => {
                const value = data.datasets[0].data[index]
                return {
                  text: `${label}: $${value.toFixed(2)}`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].borderColor[index],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index
                }
              })
            }
            return []
          }
        }
      },
      title: {
        display: true,
        text: 'Top Performing Links',
        color: '#f9fafb',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f9fafb',
        bodyColor: '#e5e7eb',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: $${value.toFixed(2)} (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <div className="h-80">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

// Loading skeleton for charts
export const ChartSkeleton = () => (
  <div className="h-80 bg-gradient-to-br from-gray-800/20 to-gray-900/20 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 bg-gray-700/50 rounded-full mx-auto mb-4"></div>
      <div className="h-4 bg-gray-700/50 rounded w-32 mx-auto mb-2"></div>
      <div className="h-3 bg-gray-700/30 rounded w-24 mx-auto"></div>
    </div>
  </div>
)
