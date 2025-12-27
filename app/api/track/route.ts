import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Wir lesen auch 'ip' aus, falls das Frontend sie mitsendet
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent, ip: clientSentIp } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    // BOT FILTER
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      // --- DAS MONSTER-GEO-SCRIPT ---

      // 1. IP aus allen möglichen Headern kratzen
      const forwardedFor = request.headers.get('x-forwarded-for')
      const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
      const xRealIp = request.headers.get('x-real-ip')
      const vercelIp = request.headers.get('x-vercel-forwarded-for') // Vercel
      const xClientIp = request.headers.get('x-client-ip')

      // forwardedFor splitten (erste und letzte IP holen)
      let forwardedIpFirst = null
      let forwardedIpLast = null
      if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip)
        forwardedIpFirst = ips.length > 0 ? ips[0] : null
        forwardedIpLast = ips.length > 0 ? ips[ips.length - 1] : null
      }

      // Priorität: Client-gesendet > Cloudflare > Real-IP > Vercel > Forwarded-First
      let realIp = clientSentIp || cfConnectingIp || xRealIp || vercelIp || forwardedIpFirst || xClientIp || null

      // Private IPs filtern (die bringen uns nichts)
      if (realIp && (realIp.startsWith('192.168') || realIp.startsWith('10.') || realIp.startsWith('172.16') || realIp === '127.0.0.1')) {
        realIp = forwardedIpLast || null 
      }

      console.log(`[GEO DEBUG] IP Candidates: Sent=${clientSentIp}, CF=${cfConnectingIp}, Real=${xRealIp}, FF=${forwardedFor}, CHOSEN=${realIp}`)

      let country = null
      let countryCode = null
      let city = null
      let region = null

      // 2. Geolokalisierung starten
      if (realIp && realIp !== 'unknown') {
        try {
          // Versuch 1: ip-api.com
          const res = await fetch(`http://ip-api.com/json/${realIp}?fields=status,country,countryCode,city,regionName`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(3000)
          })
          const data = await res.json()

          if (data.status === 'success') {
            // CHECK: Ist es Ashburn? Wenn ja -> Alarm!
            if (data.country === 'United States' && (data.city === 'Ashburn' || data.city === 'Washington')) {
              console.log('[GEO WARNING] Ashburn detected. Trying fallback strategies...')
              
              // Fallback A: Versuch es mit der LETZTEN IP aus der Kette (falls wir hinter einem Proxy sind)
              if (forwardedIpLast && forwardedIpLast !== realIp) {
                 try {
                    const res2 = await fetch(`http://ip-api.com/json/${forwardedIpLast}?fields=status,country,countryCode,city,regionName`, { signal: AbortSignal.timeout(3000) })
                    const data2 = await res2.json()
                    if (data2.status === 'success' && data2.city !== 'Ashburn') {
                        console.log(`[GEO FALLBACK SUCCESS] Used Last IP: ${data2.city}`)
                        country = data2.country
                        countryCode = data2.countryCode
                        city = data2.city
                        region = data2.regionName
                    }
                 } catch(err) { console.log('Fallback A failed') }
              }

              // Fallback B: Wenn immer noch Ashburn, nutze eine ganz andere API (ipapi.co)
              if (!city || city === 'Ashburn') {
                  try {
                    const res3 = await fetch(`https://ipapi.co/${realIp}/json/`, { 
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: AbortSignal.timeout(3000) 
                    })
                    const data3 = await res3.json()
                    if (data3.city && data3.city !== 'Ashburn') {
                        console.log(`[GEO FALLBACK B SUCCESS] ipapi.co found: ${data3.city}`)
                        country = data3.country_name
                        countryCode = data3.country_code
                        city = data3.city
                        region = data3.region
                    }
                  } catch(err) { console.log('Fallback B failed') }
              }

            } else {
              // Kein Ashburn? Super, nimm die Daten!
              country = data.country
              countryCode = data.countryCode
              city = data.city
              region = data.regionName
            }
          }
        } catch (error) {
          console.error('[GEO API ERROR]:', error)
        }
      }

      // 3. Wenn alles fehlschlägt, nimm Vercel Header (aber nur wenn nicht Ashburn)
      if (!city) {
        const vCity = request.headers.get('x-vercel-ip-city')
        if (vCity && vCity !== 'Ashburn') {
            country = request.headers.get('x-vercel-ip-country')
            city = vCity
            region = request.headers.get('x-vercel-ip-country-region')
        }
      }

      // 4. Speichern
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
    console.error(e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}