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
      if (!city) {
        // Versuche IP aus verschiedenen Quellen zu bekommen
        const forwardedFor = request.headers.get('x-forwarded-for')
        const cfConnectingIp = request.headers.get('cf-connecting-ip')
        const realIp = request.headers.get('x-real-ip')
        
        // Bei x-forwarded-for ist die LETZTE IP die echte Client-IP
        let forwardedIp = null
        if (forwardedFor) {
          const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip)
          forwardedIp = ips.length > 0 ? ips[ips.length - 1] : null
        }
        
        // Priorität: Client-gesendete IP > cf-connecting-ip > x-real-ip > x-forwarded-for (LETZTE IP)
        const ip = clientSentIp || cfConnectingIp || realIp || forwardedIp || null
        
        // DEBUG: Log alles
        console.log(`[GEO DEBUG] Client IP: ${clientSentIp}, CF: ${cfConnectingIp}, Real: ${realIp}, Forwarded: ${forwardedFor}, Final IP: ${ip}`)
        
        if (ip && ip !== 'unknown' && ip !== '' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.16')) {
          try {
            const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(3000)
            })
            const data = await res.json()
            
            console.log(`[GEO DEBUG] API Response:`, JSON.stringify(data))
            
            if (data.status === 'success') {
              // Wenn USA/Ashburn erkannt wird, versuche alternative API
              if (data.country === 'United States' && (data.city === 'Ashburn' || data.city === 'Washington')) {
                console.log(`[GEO DEBUG] USA/Ashburn detected, trying alternative API...`)
                try {
                  const altRes = await fetch(`https://ipapi.co/${ip}/json/`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(3000)
                  })
                  const altData = await altRes.json()
                  console.log(`[GEO DEBUG] Alternative API Response:`, JSON.stringify(altData))
                  
                  if (altData.country_name && altData.country_name !== 'United States') {
                    country = altData.country_name
                    countryCode = altData.country_code
                    city = altData.city
                    region = altData.region
                    console.log(`[GEO DEBUG] Using alternative: ${city}, ${country}`)
                  } else {
                    // Auch alternative sagt USA - verwende trotzdem die Daten
                    country = data.country || null
                    countryCode = data.countryCode || null
                    city = data.city || null
                    region = data.regionName || null
                    console.log(`[GEO DEBUG] Both APIs say USA, using: ${city}, ${country}`)
                  }
                } catch (altError) {
                  console.error(`[GEO DEBUG] Alternative API error:`, altError)
                  // Fallback auf erste API
                  country = data.country || null
                  countryCode = data.countryCode || null
                  city = data.city || null
                  region = data.regionName || null
                }
              } else {
                // Normales Ergebnis - verwende es
                country = data.country || null
                countryCode = data.countryCode || null
                city = data.city || null
                region = data.regionName || null
                console.log(`[GEO DEBUG] Using result: ${city}, ${country}`)
              }
            } else {
              console.log(`[GEO DEBUG] API returned error: ${data.message || 'unknown'}`)
            }
          } catch (e) {
            console.error(`[GEO DEBUG] Fetch error:`, e)
          }
        } else {
          console.log(`[GEO DEBUG] No valid IP found or IP is private`)
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