import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://berlinkassen.de",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
}

async function getGeoLocation(ip: string) {
  try {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
      return null
    }
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`)
    const data = await res.json()
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        region: data.regionName
      }
    }
  } catch (e) {
    console.error('Geo lookup failed:', e)
  }
  return null
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
      return NextResponse.json({ error: 'Domain is required' }, { status: 400, headers: corsHeaders })
    }

    const website = await prisma.website.findUnique({
      where: { domain },
    })

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404, headers: corsHeaders })
    }

    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
    
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

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201, headers: corsHeaders })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}