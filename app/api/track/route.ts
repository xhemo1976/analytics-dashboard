import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent, ip: clientSentIp } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    // BOT FILTER
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      // EINFACHE GEO-LOKALISIERUNG
      // 1. Versuche Vercel Header (falls auf Vercel gehostet)
      let country = request.headers.get('x-vercel-ip-country')
      let countryCode = request.headers.get('x-vercel-ip-country-code')
      let city = request.headers.get('x-vercel-ip-city')
      let region = request.headers.get('x-vercel-ip-country-region')
      
      // 2. Falls keine Vercel-Header, hole IP und mache einfachen Geo-Lookup
      if (!country && clientSentIp) {
        try {
          const res = await fetch(`https://ip-api.com/json/${clientSentIp}?fields=status,country,countryCode,city,regionName`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(3000)
          })
          const data = await res.json()
          
          if (data.status === 'success') {
            country = data.country || null
            countryCode = data.countryCode || null
            city = data.city || null
            region = data.regionName || null
          }
        } catch (e) {
          // Fehler ignorieren - einfach keine Geo-Daten
        }
      }

      // Gerät erkennen
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
          countryCode: countryCode || null,
          city: city ? decodeURIComponent(city) : null,
          region: region || null,
        },
      })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}