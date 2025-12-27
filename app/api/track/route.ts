import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      d: domain,
      p: urlPath,
      r: referrer,
      sw: screenWidth,
      sh: screenHeight,
      ua: userAgent,
      // NEU: Geo-Daten kommen direkt vom Client!
      country,
      countryCode,
      city,
      region
    } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      // Device-Erkennung
      let deviceType = 'desktop'
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent || '')) {
        deviceType = 'tablet'
      } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(userAgent || '')) {
        deviceType = 'mobile'
      }

      // Browser-Erkennung
      let browser = 'Unknown'
      if (userAgent) {
        if (userAgent.includes('Firefox')) browser = 'Firefox'
        else if (userAgent.includes('Edg')) browser = 'Edge'
        else if (userAgent.includes('Chrome')) browser = 'Chrome'
        else if (userAgent.includes('Safari')) browser = 'Safari'
      }

      // OS-Erkennung
      let os = 'Unknown'
      if (userAgent) {
        if (userAgent.includes('Windows')) os = 'Windows'
        else if (userAgent.includes('Mac OS')) os = 'macOS'
        else if (userAgent.includes('Android')) os = 'Android'
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
        else if (userAgent.includes('Linux')) os = 'Linux'
      }

      console.log(`[TRACK] ${city || 'Unknown'}, ${country || 'Unknown'} - ${deviceType} - ${browser}`)

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
          // Geo-Daten direkt vom Client übernehmen!
          country: country || null,
          countryCode: countryCode || null,
          city: city || null,
          region: region || null,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[TRACK ERROR]', e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
