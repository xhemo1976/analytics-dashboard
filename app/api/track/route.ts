import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Erlaubte Origins konfigurieren
const allowedOrigins = [
  "https://berlinkassen.de",
  "https://www.berlinkassen.de",
  "http://localhost:3000",
]

function getCorsHeaders(origin: string | null) {
  // Wenn kein Origin da ist (z.B. Server-zu-Server), erlauben wir Standard oder blockieren.
  // Hier erlauben wir den expliziten Abgleich.
  const isAllowed = origin && allowedOrigins.some(o => origin.includes(o.replace('https://', '').replace('http://', '')));
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Credentials auf false, weil sendBeacon/JSON Blob das oft einfacher handhaben
    // und wir keine Cookies für Auth brauchen.
    "Access-Control-Allow-Credentials": "true", 
  }
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
    // sendBeacon sendet manchmal Plain Text, wir parsen es sicherheitshalber
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
    }

    const { 
      domain, urlPath, referrer, userAgent,
      deviceType, browser, os, screenWidth, screenHeight,
      source, medium, campaign, sessionId
    } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain required' }, { status: 400, headers })
    }

    // Website finden
    const website = await prisma.website.findUnique({
      where: { domain },
    })

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404, headers })
    }

    // GEO LOCATION via Vercel Headers (Blitzschnell, kein Timeout)
    const country = request.headers.get('x-vercel-ip-country');
    const region = request.headers.get('x-vercel-ip-country-region');
    const city = request.headers.get('x-vercel-ip-city');

    // Event speichern
    const event = await prisma.event.create({
      data: {
        websiteId: website.id,
        urlPath: urlPath || '/',
        referrer: referrer || null,
        userAgent: userAgent || null,
        deviceType: deviceType || null,
        browser: browser || null,
        os: os || null,
        screenWidth: screenWidth || null,
        screenHeight: screenHeight || null,
        // Geo Daten direkt von Vercel
        country: country || null,
        countryCode: country || null,
        city: city || null,
        region: region || null,
        // Kampagnen Daten
        source: source || null,
        medium: medium || null,
        campaign: campaign || null,
        sessionId: sessionId || null,
      },
    })

    return NextResponse.json({ success: true, id: event.id }, { status: 201, headers })

  } catch (error) {
    console.error('Tracking Error:', error)
    return NextResponse.json({ error: 'Server Error' }, { status: 500, headers })
  }
}