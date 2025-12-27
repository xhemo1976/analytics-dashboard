import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      // 1. Startwerte aus Vercel-Header
      let country = request.headers.get('x-vercel-ip-country')
      let countryCode = request.headers.get('x-vercel-ip-country-code')
      let city = request.headers.get('x-vercel-ip-city')
      let region = request.headers.get('x-vercel-ip-country-region')

      // 2. PRÜFUNG: Ist das Ergebnis "Ashburn"? Wenn ja, ist es wahrscheinlich falsch.
      // Oder wenn gar keine Stadt gefunden wurde.
      if (!city || city === 'Ashburn' || country === 'US') {
        
        // ECHTE IP ERMITTELN (Hier war vorhin der Fehler!)
        const forwardedFor = request.headers.get('x-forwarded-for')
        let realIp = null

        if (forwardedFor) {
          // WICHTIG: Wir nehmen die ERSTE IP (das ist der Nutzer), nicht die letzte!
          const ips = forwardedFor.split(',')
          realIp = ips[0].trim()
        }

        // Fallback: Wenn x-forwarded-for leer ist, nimm x-real-ip
        if (!realIp) {
            realIp = request.headers.get('x-real-ip')
        }

        console.log('[GEO FIX] Checking Real IP:', realIp)

        if (realIp) {
          try {
            // Externe Prüfung mit der ECHTEN Handy-IP
            const res = await fetch(`http://ip-api.com/json/${realIp}`)
            const data = await res.json()

            if (data.status === 'success') {
              console.log('[GEO FIX] Found better location:', data.city, data.country)
              country = data.country
              countryCode = data.countryCode
              city = data.city
              region = data.regionName
            }
          } catch (error) {
            console.error('[GEO FIX] API Error:', error)
          }
        }
      }

      // 3. Speichern
      await prisma.event.create({
        data: {
          websiteId: website.id,
          urlPath: urlPath || '/',
          referrer: referrer || null,
          userAgent: userAgent || null,
          deviceType: /mobile/i.test(userAgent || '') ? 'mobile' : 'desktop', // Vereinfacht
          browser: 'Chrome', // Vereinfacht für Test
          os: 'Android', // Vereinfacht für Test
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