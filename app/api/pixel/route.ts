import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('d')
    const urlPath = searchParams.get('p') || '/'
    const referrer = searchParams.get('r') || null
    const screenWidth = parseInt(searchParams.get('sw') || '0') || null
    const screenHeight = parseInt(searchParams.get('sh') || '0') || null
    
    const ua = request.headers.get('user-agent') || ''
    
    let deviceType = 'desktop'
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) deviceType = 'tablet'
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) deviceType = 'mobile'
    
    let browser = 'Unknown'
    if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Edg')) browser = 'Edge'
    else if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Safari')) browser = 'Safari'
    
    let os = 'Unknown'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
    else if (ua.includes('Linux')) os = 'Linux'

    if (domain) {
      const website = await prisma.website.findUnique({
        where: { domain },
      })

      if (website) {
        // IP-Adresse aus verschiedenen Headern extrahieren (für Proxies/CDNs)
        const forwardedFor = request.headers.get('x-forwarded-for')
        const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
        const realIp = request.headers.get('x-real-ip')
        const clientIp = request.headers.get('x-client-ip')
        const vercelIp = request.headers.get('x-vercel-forwarded-for') // Vercel
        
        // Priorität: cf-connecting-ip > x-real-ip > x-vercel-forwarded-for > x-forwarded-for (erste IP) > x-client-ip
        let ip = cfConnectingIp || realIp || vercelIp || (forwardedFor?.split(',')[0]?.trim()) || clientIp || null
        
        let geo = null
        try {
          // Versuche immer Geolokalisierung, auch wenn IP nicht perfekt ist
          if (ip && ip !== 'unknown' && ip !== '' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.16')) {
            // Verwende HTTPS für die IP-API mit spezifischer IP
            const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
              headers: {
                'User-Agent': 'Mozilla/5.0'
              },
              // Timeout nach 5 Sekunden
              signal: AbortSignal.timeout(5000)
            })
            const data = await res.json()
            
            if (data.status === 'success') {
              geo = {
                country: data.country || null,
                countryCode: data.countryCode || null,
                city: data.city || null,
                region: data.regionName || null
              }
              console.log(`[Geo Success] IP: ${ip}, Country: ${geo.country}, City: ${geo.city}`)
            } else {
              console.log(`[Geo Failed] IP: ${ip}, Status: ${data.status}, Message: ${data.message || 'unknown'}`)
            }
          }
          
          // Fallback: Wenn keine IP oder Geo-Lookup fehlgeschlagen, versuche alternative Methode
          if (!geo) {
            try {
              // Versuche ipapi.co als Alternative
              const res = await fetch(`https://ipapi.co/json/`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0'
                },
                signal: AbortSignal.timeout(5000)
              })
              const data = await res.json()
              
              if (data.country_name) {
                geo = {
                  country: data.country_name || null,
                  countryCode: data.country_code || null,
                  city: data.city || null,
                  region: data.region || null
                }
                console.log(`[Geo Fallback Success] Country: ${geo.country}, City: ${geo.city}`)
              }
            } catch (fallbackError) {
              console.error('[Geo Fallback Error]:', fallbackError)
            }
          }
        } catch (e) {
          console.error('[Geo Lookup Error]:', e, 'IP:', ip)
        }

        await prisma.event.create({
          data: {
            websiteId: website.id,
            urlPath,
            referrer,
            userAgent: ua,
            deviceType,
            browser,
            os,
            screenWidth,
            screenHeight,
            country: geo?.country || null,
            countryCode: geo?.countryCode || null,
            city: geo?.city || null,
            region: geo?.region || null,
          },
        })
      }
    }
  } catch (e) {
    console.error('Pixel error:', e)
  }

  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
