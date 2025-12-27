'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

interface Stats {
  totalViews: number
  uniqueSessions: number
  newVisitors: number
  returningVisitors: number
  pageViews: Record<string, number>
  referrers: Record<string, number>
  devices: Record<string, number>
  browsers: Record<string, number>
  operatingSystems: Record<string, number>
  sources: Record<string, number>
  viewsPerDay: Record<string, number>
  viewsPerHour: Record<string, number>
  screenSizes: Record<string, number>
  recentEvents: Array<{
    id: string
    urlPath: string
    referrer: string | null
    deviceType: string | null
    browser: string | null
    os: string | null
    source: string | null
    createdAt: string
  }>
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#84CC16']

const DEVICE_ICONS: Record<string, string> = {
  desktop: '🖥️',
  mobile: '📱',
  tablet: '📱',
  Unknown: '❓'
}

const OS_ICONS: Record<string, string> = {
  'Windows 10': '🪟',
  'Windows 11': '🪟',
  'Windows': '🪟',
  'macOS': '🍎',
  'Linux': '🐧',
  'Android': '🤖',
  'iOS': '📱',
  'Unknown': '❓'
}

const BROWSER_ICONS: Record<string, string> = {
  'Chrome': '🌐',
  'Safari': '🧭',
  'Firefox': '🦊',
  'Edge': '🌊',
  'Opera': '⭕',
  'Unknown': '❓'
}

const SOURCE_ICONS: Record<string, string> = {
  'Google': '🔍',
  'Bing': '🔎',
  'Facebook': '👤',
  'Instagram': '📸',
  'TikTok': '🎵',
  'Twitter/X': '🐦',
  'LinkedIn': '💼',
  'YouTube': '▶️',
  'Pinterest': '📌',
  'Reddit': '🤖',
  'Direct': '🔗'
}

export default function Dashboard() {
  const [domain, setDomain] = useState('berlinkassen.de')
  const [days, setDays] = useState(7)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stats?domain=${domain}&days=${days}`)
      if (!res.ok) throw new Error('Website nicht gefunden')
      const data = await res.json()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [days])

  const chartData = stats
    ? Object.entries(stats.viewsPerDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, views]) => ({ date: date.slice(5), views }))
    : []

  const hourlyData = stats
    ? Object.entries(stats.viewsPerHour)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, views]) => ({ hour, views }))
    : []

  const deviceData = stats
    ? Object.entries(stats.devices).map(([name, value]) => ({ name, value }))
    : []

  const browserData = stats
    ? Object.entries(stats.browsers).map(([name, value]) => ({ name, value }))
    : []

  const osData = stats
    ? Object.entries(stats.operatingSystems).map(([name, value]) => ({ name, value }))
    : []

  const sourceData = stats
    ? Object.entries(stats.sources)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 p-6 lg:p-10 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Echtzeit-Einblicke in deine Website-Performance</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Domain eingeben"
                className="bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl w-64 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer"
            >
              <option value={1} className="bg-gray-900">Heute</option>
              <option value={7} className="bg-gray-900">7 Tage</option>
              <option value={30} className="bg-gray-900">30 Tage</option>
              <option value={90} className="bg-gray-900">90 Tage</option>
            </select>

            <button
              onClick={fetchStats}
              disabled={loading}
              className="relative group bg-gradient-to-r from-violet-600 to-cyan-600 px-8 py-3 rounded-2xl font-semibold overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50"
            >
              <span className="relative z-10">{loading ? '⏳ Laden...' : '🔄 Aktualisieren'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 backdrop-blur-xl">
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['overview', 'audience', 'technology', 'sources', 'pages', 'live'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab === 'overview' && '📊 Übersicht'}
              {tab === 'audience' && '👥 Besucher'}
              {tab === 'technology' && '💻 Technologie'}
              {tab === 'sources' && '🔗 Quellen'}
              {tab === 'pages' && '📄 Seiten'}
              {tab === 'live' && '⚡ Live'}
            </button>
          ))}
        </div>

        {stats && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <StatsCard
                    title="Seitenaufrufe"
                    value={stats.totalViews}
                    icon="👁️"
                    gradient="from-violet-500 to-purple-500"
                  />
                  <StatsCard
                    title="Unique Sessions"
                    value={stats.uniqueSessions}
                    icon="🎯"
                    gradient="from-cyan-500 to-blue-500"
                  />
                  <StatsCard
                    title="Neue Besucher"
                    value={stats.newVisitors}
                    icon="✨"
                    gradient="from-emerald-500 to-green-500"
                  />
                  <StatsCard
                    title="Wiederkehrend"
                    value={stats.returningVisitors}
                    icon="🔄"
                    gradient="from-orange-500 to-amber-500"
                  />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Area Chart - Views über Zeit */}
                  <GlassCard title="📈 Besucher-Trend" subtitle={`Letzte ${days} Tage`}>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(17, 17, 27, 0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              backdropFilter: 'blur(10px)'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="#8B5CF6"
                            strokeWidth={3}
                            fill="url(#colorViews)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  {/* Pie Chart - Geräte */}
                  <GlassCard title="📱 Geräte" subtitle="Verteilung nach Gerätetyp">
                    <div className="h-72 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {deviceData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(17, 17, 27, 0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                      {deviceData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-gray-400 text-sm">{DEVICE_ICONS[item.name]} {item.name}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Top Quellen */}
                  <GlassCard title="🔗 Traffic Quellen" subtitle="Woher kommen die Besucher">
                    <div className="space-y-3">
                      {sourceData.slice(0, 6).map((item, i) => (
                        <ProgressBar
                          key={item.name}
                          label={`${SOURCE_ICONS[item.name] || '🔗'} ${item.name}`}
                          value={item.value}
                          max={stats.totalViews}
                          color={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </div>
                  </GlassCard>

                  {/* Top Seiten */}
                  <GlassCard title="📄 Top Seiten" subtitle="Meistbesuchte Seiten">
                    <div className="space-y-3">
                      {Object.entries(stats.pageViews)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([page, count], i) => (
                          <ProgressBar
                            key={page}
                            label={page}
                            value={count}
                            max={stats.totalViews}
                            color={COLORS[i % COLORS.length]}
                          />
                        ))}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {/* Audience Tab */}
            {activeTab === 'audience' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <StatsCard title="Neue Besucher" value={stats.newVisitors} icon="✨" gradient="from-emerald-500 to-green-500" />
                  <StatsCard title="Wiederkehrend" value={stats.returningVisitors} icon="🔄" gradient="from-blue-500 to-cyan-500" />
                  <StatsCard title="Sessions" value={stats.uniqueSessions} icon="🎯" gradient="from-violet-500 to-purple-500" />
                  <StatsCard title="Seitenaufrufe" value={stats.totalViews} icon="👁️" gradient="from-orange-500 to-amber-500" />
                </div>

              </div>
            )}

            {/* Technology Tab */}
            {activeTab === 'technology' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Geräte */}
                  <GlassCard title="📱 Geräte" subtitle="Desktop vs Mobile">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                            {deviceData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 17, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {deviceData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span>{DEVICE_ICONS[item.name]} {item.name}</span>
                          </div>
                          <span className="text-gray-400">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Browser */}
                  <GlassCard title="🌐 Browser" subtitle="Verwendete Browser">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={browserData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                            {browserData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 17, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {browserData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span>{BROWSER_ICONS[item.name]} {item.name}</span>
                          </div>
                          <span className="text-gray-400">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Betriebssysteme */}
                  <GlassCard title="💻 Betriebssysteme" subtitle="OS Verteilung">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={osData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                            {osData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 17, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {osData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span>{OS_ICONS[item.name]} {item.name}</span>
                          </div>
                          <span className="text-gray-400">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>

                {/* Bildschirmgrößen */}
                <GlassCard title="🖥️ Bildschirmauflösungen" subtitle="Top Auflösungen">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(stats.screenSizes)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 12)
                      .map(([size, count]) => (
                        <div key={size} className="bg-white/5 rounded-xl p-4 text-center">
                          <div className="text-lg font-bold text-violet-400">{size}</div>
                          <div className="text-gray-400 text-sm">{count} Besucher</div>
                        </div>
                      ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Sources Tab */}
            {activeTab === 'sources' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Traffic Quellen Bar Chart */}
                  <GlassCard title="🔗 Traffic Quellen" subtitle="Woher kommen die Besucher">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceData} layout="vertical">
                          <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} width={100} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 17, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                          <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  {/* Referrers */}
                  <GlassCard title="🔗 Referrer URLs" subtitle="Verweisende Seiten">
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {Object.entries(stats.referrers)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 15)
                        .map(([ref, count], i) => (
                          <ProgressBar
                            key={ref}
                            label={ref.length > 40 ? ref.slice(0, 40) + '...' : ref}
                            value={count}
                            max={stats.totalViews}
                            color={COLORS[i % COLORS.length]}
                          />
                        ))}
                    </div>
                  </GlassCard>
                </div>

                {/* Social Media Breakdown */}
                <GlassCard title="📱 Social Media Breakdown" subtitle="Traffic von Social Platforms">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {['Google', 'Facebook', 'Instagram', 'TikTok', 'Twitter/X', 'LinkedIn', 'YouTube'].map((platform) => {
                      const count = stats.sources[platform] || 0
                      return (
                        <div key={platform} className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-all">
                          <div className="text-3xl mb-2">{SOURCE_ICONS[platform]}</div>
                          <div className="text-2xl font-bold text-white">{count}</div>
                          <div className="text-gray-400 text-sm">{platform}</div>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Pages Tab */}
            {activeTab === 'pages' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Seiten */}
                  <GlassCard title="📄 Meistbesuchte Seiten" subtitle="Top Seiten nach Aufrufen">
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {Object.entries(stats.pageViews)
                        .sort(([, a], [, b]) => b - a)
                        .map(([page, count], i) => (
                          <ProgressBar
                            key={page}
                            label={page}
                            value={count}
                            max={stats.totalViews}
                            color={COLORS[i % COLORS.length]}
                          />
                        ))}
                    </div>
                  </GlassCard>

                  {/* Views pro Stunde */}
                  <GlassCard title="⏰ Views pro Stunde" subtitle="Heute">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyData}>
                          <XAxis dataKey="hour" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 17, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                          <Bar dataKey="views" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {/* Live Tab */}
            {activeTab === 'live' && (
              <div className="space-y-8">
                <GlassCard title="⚡ Live Aktivität" subtitle="Letzte 50 Besuche in Echtzeit">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-left border-b border-white/10">
                          <th className="pb-4 font-medium">Zeit</th>
                          <th className="pb-4 font-medium">Seite</th>
                          <th className="pb-4 font-medium">Gerät</th>
                          <th className="pb-4 font-medium">Browser</th>
                          <th className="pb-4 font-medium">Quelle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentEvents.map((event, i) => (
                          <tr key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 text-gray-400">
                              {new Date(event.createdAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-4">
                              <span className="bg-violet-500/20 text-violet-400 px-2 py-1 rounded-lg text-xs">{event.urlPath}</span>
                            </td>
                            <td className="py-4">{DEVICE_ICONS[event.deviceType || 'Unknown']} {event.deviceType || '-'}</td>
                            <td className="py-4">{BROWSER_ICONS[event.browser || 'Unknown']} {event.browser || '-'}</td>
                            <td className="py-4">
                              <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg text-xs">
                                {SOURCE_ICONS[event.source || 'Direct']} {event.source || 'Direct'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>🚀 Powered by Next.js & Prisma • Built with 💜</p>
        </div>
      </div>
    </div>
  )
}

// Components

function GlassCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon, gradient }: { title: string; value: number; icon: string; gradient: string }) {
  return (
    <div className="relative group">
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient} rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity`} />
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">{title}</span>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="text-3xl lg:text-4xl font-black text-white">{value.toLocaleString('de-DE')}</div>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 truncate mr-4">{label}</span>
        <span className="text-gray-400">{value}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}