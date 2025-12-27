import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { d: domain, p: urlPath, r: referrer, sw: screenWidth, sh: screenHeight, ua: userAgent } = body

    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    // BOT FILTER
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|jetpack/i.test(userAgent || '')
    if (isBot) return NextResponse.json({ success: true, message: 'Bot ignored' })

    const website = await prisma.website.findUnique({ where: { domain } })

    if (website) {
      // GEO LOCATION - Versuche zuerst Vercel Header (falls auf Vercel gehostet)
      let country = request.headers.get('x-vercel-ip-country')
      let countryCode = request.headers.get('x-vercel-ip-country-code')
      let region = request.headers.get('x-vercel-ip-country-region')
      let city = request.headers.get('x-vercel-ip-city')
      
      // Falls Vercel-Header nicht vorhanden, verwende IP-basierte Geolokalisierung
      if (!country || !city) {
        // IP-Adresse aus verschiedenen Headern extrahieren
        const forwardedFor = request.headers.get('x-forwarded-for')
        const cfConnectingIp = request.headers.get('cf-connecting-ip')
        const realIp = request.headers.get('x-real-ip')
        const clientIp = request.headers.get('x-client-ip')
        const vercelIp = request.headers.get('x-vercel-forwarded-for')
        
        // Bei x-forwarded-for ist die LETZTE IP die echte Client-IP
        let forwardedIp = null
        if (forwardedFor) {
          const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip)
          forwardedIp = ips.length > 0 ? ips[ips.length - 1] : null
        }
        
        // Priorität: cf-connecting-ip > x-real-ip > x-vercel-forwarded-for > x-forwarded-for (LETZTE IP) > x-client-ip
        const ip = cfConnectingIp || realIp || vercelIp || forwardedIp || clientIp || null
        
        if (ip && ip !== 'unknown' && ip !== '' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.16')) {
          try {
            // Verwende ip-api.com für Geolokalisierung
            const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(5000)
            })
            const data = await res.json()
            
            if (data.status === 'success') {
              // Überschreibe nur wenn Vercel-Header nicht vorhanden waren
              if (!country) country = data.country || null
              if (!countryCode) countryCode = data.countryCode || null
              if (!city) city = data.city || null
              if (!region) region = data.regionName || null
              
              // Prüfe auf verdächtige Ergebnisse (Ashburn/USA)
              if (data.country === 'United States' && data.city === 'Ashburn') {
                console.log(`[Track Warning] Suspicious geo result (Ashburn/USA) for IP: ${ip}, trying fallback...`)
                // Versuche Fallback-API
                try {
                  const fallbackRes = await fetch(`https://ipapi.co/json/`, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0',
                      'X-Forwarded-For': forwardedFor || ip || ''
                    },
                    signal: AbortSignal.timeout(5000)
                  })
                  const fallbackData = await fallbackRes.json()
                  
                  if (fallbackData.country_name && !fallbackData.error && fallbackData.country_name !== 'United States') {
                    country = fallbackData.country_name || country
                    countryCode = fallbackData.country_code || countryCode
                    city = fallbackData.city || city
                    region = fallbackData.region || region
                    console.log(`[Track Fallback Success] Country: ${country}, City: ${city}`)
                  }
                } catch (fallbackError) {
                  console.error('[Track Fallback Error]:', fallbackError)
                }
              }
            }
          } catch (geoError) {
            console.error('[Track Geo Error]:', geoError)
          }
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