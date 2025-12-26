import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    // 1. Website finden
    const website = await prisma.website.findUnique({
      where: { domain },
    })

    if (website) {
      // 2. Simple User-Agent Analyse (manuell, spart Bibliotheken)
      let deviceType = 'desktop'
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) deviceType = 'tablet'
      else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) deviceType = 'mobile'

      let browser = 'Unknown'
      if (userAgent.includes('Firefox')) browser = 'Firefox'
      else if (userAgent.includes('Chrome')) browser = 'Chrome'
      else if (userAgent.includes('Safari')) browser = 'Safari'
      else if (userAgent.includes('Edg')) browser = 'Edge'

      let os = 'Unknown'
      if (userAgent.includes('Windows')) os = 'Windows'
      else if (userAgent.includes('Mac OS')) os = 'macOS'
      else if (userAgent.includes('Android')) os = 'Android'
      else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
      else if (userAgent.includes('Linux')) os = 'Linux'

      // 3. GEO LOCATION via Vercel Headers (Das ist der Schlüssel!)
      // Kein externer API Call nötig. Vercel liefert das gratis mit.
      const country = request.headers.get('x-vercel-ip-country')
      const region = request.headers.get('x-vercel-ip-country-region')
      const city = request.headers.get('x-vercel-ip-city')

      // 4. Speichern
      await prisma.event.create({
        data: {
          websiteId: website.id,
          urlPath: urlPath || '/',
          referrer: referrer || null,
          userAgent: userAgent || null,
          deviceType,
          browser,
          os,
          screenWidth: Number(screenWidth) || null,
          screenHeight: Number(screenHeight) || null,
          country: country || null,
          countryCode: country || null, // Vercel liefert oft den Code als Country
          city: city || null,
          region: region || null,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Tracking error:', e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}