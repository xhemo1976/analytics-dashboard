import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const days = parseInt(searchParams.get('days') || '7')

  if (!domain) {
    return NextResponse.json({ error: 'Domain required' }, { status: 400 })
  }

  const website = await prisma.website.findUnique({
    where: { domain },
  })

  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  const since = days >= 9999 ? new Date(0) : new Date()
  if (days < 9999) {
    since.setDate(since.getDate() - days)
  }

  const events = await prisma.event.findMany({
    where: {
      websiteId: website.id,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Gesamtstatistiken
  const totalViews = events.length
  const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size
  const newVisitors = events.filter(e => e.isNewVisitor).length
  
  // Durchschnittliche Seiten pro Session
  const sessionsMap = new Map<string, number>()
  events.forEach(e => {
    if (e.sessionId) {
      sessionsMap.set(e.sessionId, (sessionsMap.get(e.sessionId) || 0) + 1)
    }
  })
  const avgPagesPerSession = uniqueSessions > 0 
    ? parseFloat((Array.from(sessionsMap.values()).reduce((a, b) => a + b, 0) / uniqueSessions).toFixed(2))
    : 0
  
  // Bounce-Rate (Sessions mit nur 1 Seitenaufruf)
  const singlePageSessions = Array.from(sessionsMap.values()).filter(count => count === 1).length
  const bounceRate = uniqueSessions > 0 
    ? parseFloat(((singlePageSessions / uniqueSessions) * 100).toFixed(1))
    : 0

  // Seiten
  const pageViews = events.reduce((acc, e) => {
    acc[e.urlPath] = (acc[e.urlPath] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Referrer
  const referrers = events.reduce((acc, e) => {
    const ref = e.referrer || 'Direct'
    acc[ref] = (acc[ref] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Geräte
  const devices = events.reduce((acc, e) => {
    const device = e.deviceType || 'Unknown'
    acc[device] = (acc[device] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Browser
  const browsers = events.reduce((acc, e) => {
    const browser = e.browser || 'Unknown'
    acc[browser] = (acc[browser] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Betriebssysteme
  const operatingSystems = events.reduce((acc, e) => {
    const os = e.os || 'Unknown'
    acc[os] = (acc[os] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Traffic Sources
  const sources = events.reduce((acc, e) => {
    const source = e.source || 'Direct'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Views pro Tag
  const viewsPerDay = events.reduce((acc, e) => {
    const day = e.createdAt.toISOString().split('T')[0]
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Views pro Stunde (heute)
  const today = new Date().toISOString().split('T')[0]
  const viewsPerHour = events
    .filter(e => e.createdAt.toISOString().startsWith(today))
    .reduce((acc, e) => {
      const hour = e.createdAt.getHours().toString().padStart(2, '0') + ':00'
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  // Bildschirmgrößen
  const screenSizes = events.reduce((acc, e) => {
    if (e.screenWidth && e.screenHeight) {
      const size = `${e.screenWidth}x${e.screenHeight}`
      acc[size] = (acc[size] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    totalViews,
    uniqueSessions,
    newVisitors,
    returningVisitors: uniqueSessions - newVisitors,
    avgPagesPerSession,
    bounceRate,
    pageViews,
    referrers,
    devices,
    browsers,
    operatingSystems,
    sources,
    viewsPerDay,
    viewsPerHour,
    screenSizes,
    recentEvents: events.slice(0, 50).map(e => ({
      id: e.id,
      urlPath: e.urlPath,
      referrer: e.referrer,
      deviceType: e.deviceType,
      browser: e.browser,
      os: e.os,
      source: e.source,
      createdAt: e.createdAt
    })),
  })
}