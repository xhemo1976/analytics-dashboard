import { prisma } from '@/lib/prisma'

import { NextRequest, NextResponse } from 'next/server'

 

export async function POST(request: NextRequest) {

  try {

    const body = await request.json()

    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent, ip: clientSentIp } = body

 

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

 

    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')

    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

 

    const website = await prisma.website.findUnique({ where: { domain } })

 

    if (website) {

      // ============================================

      // SCHRITT 1: Alle möglichen IP-Quellen sammeln

      // ============================================

      const allHeaders: Record<string, string | null> = {

        'x-real-ip': request.headers.get('x-real-ip'),

        'x-forwarded-for': request.headers.get('x-forwarded-for'),

        'cf-connecting-ip': request.headers.get('cf-connecting-ip'),

        'x-vercel-forwarded-for': request.headers.get('x-vercel-forwarded-for'),

        'x-client-ip': request.headers.get('x-client-ip'),

        'x-vercel-ip-country': request.headers.get('x-vercel-ip-country'),

        'x-vercel-ip-city': request.headers.get('x-vercel-ip-city'),

      }

 

      // x-forwarded-for aufsplitten

      const forwardedFor = allHeaders['x-forwarded-for']

      let ffFirst: string | null = null

      let ffLast: string | null = null

      if (forwardedFor) {

        const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip)

        ffFirst = ips[0] || null

        ffLast = ips[ips.length - 1] || null

      }

 

      // ============================================

      // SCHRITT 2: Vercel Geo-Header prüfen (BESTE QUELLE!)

      // ============================================

      let country: string | null = null

      let countryCode: string | null = null

      let city: string | null = null

      let region: string | null = null

 

      const vercelCity = request.headers.get('x-vercel-ip-city')

      const vercelCountry = request.headers.get('x-vercel-ip-country')

 

      // Wenn Vercel eine Stadt hat und es NICHT Ashburn ist, nimm diese!

      if (vercelCity && vercelCity !== 'Ashburn' && vercelCountry !== 'US') {

        country = request.headers.get('x-vercel-ip-country')

        countryCode = request.headers.get('x-vercel-ip-country-code')

        city = vercelCity

        region = request.headers.get('x-vercel-ip-country-region')

        console.log(`[GEO] Vercel headers used: ${city}, ${country}`)

      }

 

      // ============================================

      // SCHRITT 3: Wenn Vercel nicht hilft, IP-API nutzen

      // ============================================

      if (!city || city === 'Ashburn') {

        // IP-Priorität: Client-gesendet > Cloudflare > x-real-ip > erste aus forwarded-for

        const realIp = clientSentIp

          || allHeaders['cf-connecting-ip']

          || allHeaders['x-real-ip']

          || ffFirst

          || ffLast

          || null

 

        // Private IPs ignorieren

        const isPrivate = realIp && (

          realIp.startsWith('192.168.') ||

          realIp.startsWith('10.') ||

          realIp.startsWith('172.16.') ||

          realIp.startsWith('172.17.') ||

          realIp.startsWith('172.18.') ||

          realIp.startsWith('172.19.') ||

          realIp.startsWith('172.2') ||

          realIp.startsWith('172.3') ||

          realIp === '127.0.0.1' ||

          realIp === '::1'

        )

 

        console.log(`[GEO] Headers: ${JSON.stringify(allHeaders)}`)

        console.log(`[GEO] Client sent IP: ${clientSentIp}`)

        console.log(`[GEO] Chosen IP: ${realIp}, isPrivate: ${isPrivate}`)

 

        if (realIp && !isPrivate) {

          // WICHTIG: ip-api.com kostenlos funktioniert nur über HTTP!

          try {

            const res = await fetch(`http://ip-api.com/json/${realIp}?fields=status,message,country,countryCode,city,regionName`, {

              signal: AbortSignal.timeout(5000)

            })

            const data = await res.json()

            console.log(`[GEO] ip-api.com response:`, JSON.stringify(data))

 

            if (data.status === 'success') {

              // Ist es NICHT Ashburn?

              if (!(data.country === 'United States' && data.city === 'Ashburn')) {

                country = data.country

                countryCode = data.countryCode

                city = data.city

                region = data.regionName

                console.log(`[GEO] SUCCESS: ${city}, ${country}`)

              } else {

                console.log(`[GEO] Got Ashburn again, trying other IPs...`)

 

                // Versuche mit einer anderen IP aus der Kette

                const alternativeIp = (ffFirst !== realIp) ? ffFirst : ffLast

                if (alternativeIp && alternativeIp !== realIp) {

                  try {

                    const res2 = await fetch(`http://ip-api.com/json/${alternativeIp}?fields=status,country,countryCode,city,regionName`, {

                      signal: AbortSignal.timeout(3000)

                    })

                    const data2 = await res2.json()

                    if (data2.status === 'success' && data2.city !== 'Ashburn') {

                      country = data2.country

                      countryCode = data2.countryCode

                      city = data2.city

                      region = data2.regionName

                      console.log(`[GEO] Alternative IP worked: ${city}, ${country}`)

                    }

                  } catch (e) {

                    console.log(`[GEO] Alternative IP failed`)

                  }

                }

              }

            } else {

              console.log(`[GEO] ip-api.com error: ${data.message}`)

            }

          } catch (error) {

            console.error('[GEO] API Error:', error)

          }

        }

      }

 

      // ============================================

      // SCHRITT 4: Speichern (auch mit Debug-Info)

      // ============================================

 

      // Für Debugging: Speichere die erkannte IP im referrer-Feld (temporär!)

      const debugInfo = `IP:${clientSentIp || 'none'}|XFF:${allHeaders['x-forwarded-for'] || 'none'}`

 

      await prisma.event.create({

        data: {

          websiteId: website.id,

          urlPath: urlPath || '/',

          referrer: referrer || debugInfo, // Debug: zeigt welche IP erkannt wurde

          userAgent: userAgent || null,

          deviceType: /mobile/i.test(userAgent || '') ? 'mobile' : 'desktop',

          browser: 'Chrome',

          os: 'Android',

          screenWidth: Number(screenWidth) || null,

          screenHeight: Number(screenHeight) || null,

          country: country || 'DEBUG:NO_GEO',

          countryCode: countryCode || null,

          city: city ? decodeURIComponent(city) : 'DEBUG:NO_CITY',

          region: region || null,

        },

      })

 

      console.log(`[GEO] FINAL RESULT: ${city || 'NO_CITY'}, ${country || 'NO_COUNTRY'}`)

    }

 

    return NextResponse.json({ success: true })

  } catch (e) {

    console.error('[TRACK ERROR]', e)

    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })

  }

}