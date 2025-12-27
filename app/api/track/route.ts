import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Hier kommt die IP an, die wir im WordPress-Skript geholt haben
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent, ip: manualIp } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    // Bot Filter
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      let country = null
      let city = null
      let region = null
      let countryCode = null

      // DIE KNALLHARTE LOGIK:
      // Wenn das Handy uns eine IP geschickt hat (manualIp), nutzen wir NUR DIE.
      // Wir fragen Vercel gar nicht mehr nach der Meinung.
      if (manualIp) {
        console.log('Benutze manuelle Handy-IP:', manualIp)
        try {
          const res = await fetch(`http://ip-api.com/json/${manualIp}`)
          const data = await res.json()
          if (data.status === 'success') {
             country = data.country
             countryCode = data.countryCode
             city = data.city
             region = data.regionName
          }
        } catch (e) {
          console.error('Geo API Fehler:', e)
        }
      } 
      
      // Fallback: Nur wenn das Handy KEINE IP geschickt hat (sollte nicht passieren)
      if (!city) {
         country = request.headers.get('x-vercel-ip-country')
         city = request.headers.get('x-vercel-ip-city')
         region = request.headers.get('x-vercel-ip-country-region')
      }

      await prisma.event.create({
        data: {
          websiteId: website.id,
          urlPath: urlPath || '/',
          referrer: referrer || null,
          userAgent: userAgent || null,
          deviceType: /mobile/i.test(userAgent || '') ? 'mobile' : 'desktop',
          browser: 'Chrome',
          os: 'Android',
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