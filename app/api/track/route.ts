import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const allowedOrigins = [
  "https://berlinkassen.de",
  "https://www.berlinkassen.de",
  "http://localhost:3000",
]

function getCorsHeaders(origin: string | null) {
  const allowOrigin = (origin && allowedOrigins.some(o => origin.startsWith(o.replace('www.', '')))) 
    ? origin 
    : "https://berlinkassen.de"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  }
}

async function getGeoLocation(ip: string) {
  try {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
      return null
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1000)

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        region: data.regionName
      }
    }
  } catch (e) {}
  return null
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return NextResponse.json({}, { headers: getCorsHeaders(origin) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = getCorsHeaders(origin)

  try {
    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
    }

    const { 
      domain, 
      urlPath, 
      referrer, 
      userAgent,
      deviceType,
      browser,
      browserVersion,
      os,
      screenWidth,
      screenHeight,
      source, 
      medium, 
      campaign,
      sessionId,
      isNewVisitor
    } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400, headers })
    }

    const website = await prisma.website.findUnique({
      where: { domain },
    })

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404, headers })
    }

    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1'
    
    const geo = await getGeoLocation(ip)

    const event = await prisma.event.create({
      data: {
        websiteId: website.id,
        urlPath: urlPath || '/',
        referrer: referrer || null,
        userAgent: userAgent || null,
        deviceType: deviceType || null,
        browser: browser || null,
        browserVersion: browserVersion || null,
        os: os || null,
        screenWidth: screenWidth || null,
        screenHeight: screenHeight || null,
        country: geo?.country || null,
        countryCode: geo?.countryCode || null,
        city: geo?.city || null,
        region: geo?.region || null,
        source: source || null,
        medium: medium || null,
        campaign: campaign || null,
        sessionId: sessionId || null,
        isNewVisitor: isNewVisitor ?? true,
      },
    })

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201, headers })

  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}