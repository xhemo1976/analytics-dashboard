import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // WICHTIG: Auch die IP auslesen, die vom Client gesendet wurde!
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent, ip: clientSentIp } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      // IP-Adresse aus verschiedenen Quellen extrahieren (für Proxies/CDNs)
      const forwardedFor = request.headers.get('x-forwarded-for')
      const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
      const xRealIp = request.headers.get('x-real-ip')
      const vercelIp = request.headers.get('x-vercel-forwarded-for') // Vercel
      const xClientIp = request.headers.get('x-client-ip')

      // WICHTIG: Bei x-forwarded-for ist die LETZTE IP die echte Client-IP!
      // Format: "client-ip, proxy1, proxy2" - wir brauchen die ERSTE (Client-IP)
      // ABER: Bei manchen Setups ist es umgekehrt. Wir probieren beide.
      let forwardedIpFirst = null
      let forwardedIpLast = null
      if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip)
        forwardedIpFirst = ips.length > 0 ? ips[0] : null
        forwardedIpLast = ips.length > 0 ? ips[ips.length - 1] : null
      }

      // Priorität: Client-gesendete IP (von ipify.org) > cf-connecting-ip > x-real-ip > x-vercel-forwarded-for > x-forwarded-for erste > x-client-ip
      let realIp = clientSentIp || cfConnectingIp || xRealIp || vercelIp || forwardedIpFirst || xClientIp || null

      // Private IPs filtern (diese sind nutzlos für Geolokalisierung)
      if (realIp && (realIp.startsWith('192.168') || realIp.startsWith('10.') || realIp.startsWith('172.16') || realIp === '127.0.0.1')) {
        realIp = forwardedIpLast || null // Versuche die letzte IP als Fallback
      }

      console.log(`[GEO DEBUG] clientSentIp: ${clientSentIp}, cf-connecting-ip: ${cfConnectingIp}, x-real-ip: ${xRealIp}, x-forwarded-for: ${forwardedFor}, Final IP: ${realIp}`)

      let country = null
      let countryCode = null
      let city = null
      let region = null

      // Geolokalisierung mit der echten IP durchführen
      if (realIp && realIp !== 'unknown' && realIp !== '') {
        try {
          // Primärer API-Aufruf mit der erkannten IP
          const res = await fetch(`https://ip-api.com/json/${realIp}?fields=status,country,countryCode,city,regionName`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000)
          })
          const data = await res.json()

          if (data.status === 'success') {
            console.log(`[GEO SUCCESS] IP: ${realIp}, City: ${data.city}, Country: ${data.country}`)

            // Prüfe ob das Ergebnis "Ashburn" ist - das wäre der Server-Standort, nicht der Client!
            if (data.country === 'United States' && data.city === 'Ashburn') {
              console.log('[GEO WARNING] Result is Ashburn (server location), trying fallback...')

              // Fallback: Versuche mit der letzten IP aus x-forwarded-for
              if (forwardedIpLast && forwardedIpLast !== realIp) {
                const res2 = await fetch(`https://ip-api.com/json/${forwardedIpLast}?fields=status,country,countryCode,city,regionName`, {
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  signal: AbortSignal.timeout(5000)
                })
                const data2 = await res2.json()
                if (data2.status === 'success' && !(data2.country === 'United States' && data2.city === 'Ashburn')) {
                  console.log(`[GEO FALLBACK SUCCESS] IP: ${forwardedIpLast}, City: ${data2.city}, Country: ${data2.country}`)
                  country = data2.country
                  countryCode = data2.countryCode
                  city = data2.city
                  region = data2.regionName
                }
              }

              // Wenn immer noch kein Ergebnis, verwende ipapi.co als letzten Fallback
              if (!city) {
                try {
                  const res3 = await fetch('https://ipapi.co/json/', {
                    headers: {
                      'User-Agent': 'Mozilla/5.0',
                      'X-Forwarded-For': forwardedFor || realIp || ''
                    },
                    signal: AbortSignal.timeout(5000)
                  })
                  const data3 = await res3.json()
                  if (data3.country_name && !data3.error && data3.city !== 'Ashburn') {
                    console.log(`[GEO FALLBACK2 SUCCESS] City: ${data3.city}, Country: ${data3.country_name}`)
                    country = data3.country_name
                    countryCode = data3.country_code
                    city = data3.city
                    region = data3.region
                  }
                } catch (e) {
                  console.error('[GEO FALLBACK2 ERROR]:', e)
                }
              }
            } else {
              // Normales Ergebnis (nicht Ashburn)
              country = data.country
              countryCode = data.countryCode
              city = data.city
              region = data.regionName
            }
          } else {
            console.log(`[GEO FAILED] IP: ${realIp}, Status: ${data.status}, Message: ${data.message || 'unknown'}`)
          }
        } catch (error) {
          console.error('[GEO API ERROR]:', error)
        }
      }

      // Fallback auf Vercel-Header wenn keine Geo-Daten gefunden wurden (aber nur wenn nicht Ashburn)
      if (!city) {
        const vercelCountry = request.headers.get('x-vercel-ip-country')
        const vercelCity = request.headers.get('x-vercel-ip-city')
        if (vercelCity && vercelCity !== 'Ashburn') {
          country = vercelCountry
          countryCode = request.headers.get('x-vercel-ip-country-code')
          city = vercelCity
          region = request.headers.get('x-vercel-ip-country-region')
          console.log(`[GEO VERCEL FALLBACK] City: ${city}, Country: ${country}`)
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