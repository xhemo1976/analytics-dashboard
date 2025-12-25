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
        
        // Priorität: cf-connecting-ip > x-real-ip > x-forwarded-for (erste IP) > x-client-ip
        let ip = cfConnectingIp || realIp || (forwardedFor?.split(',')[0]?.trim()) || clientIp || null
        
        // Debug: Log welche IP gefunden wurde
        console.log(`[IP Detection] cf-connecting-ip: ${cfConnectingIp}, x-real-ip: ${realIp}, x-forwarded-for: ${forwardedFor}, x-client-ip: ${clientIp}, Final IP: ${ip}`)
        
        let geo = null
        try {
          // Wenn IP in Headern gefunden wurde und gültig ist
          if (ip && ip !== 'unknown' && ip !== '' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.16')) {
            // Verwende HTTPS für die IP-API mit spezifischer IP
            const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
              headers: {
                'User-Agent': 'Mozilla/5.0'
              }
            })
            const data = await res.json()
            
            // Debug-Logging für alle Requests
            console.log(`[Geo] IP: ${ip}, Status: ${data.status}, Country: ${data.country}, City: ${data.city}, Device: ${deviceType}`)
            
            if (data.status === 'success') {
              // Speichere auch wenn nur Land vorhanden ist (nicht nur wenn Stadt vorhanden ist)
              geo = {
                country: data.country || null,
                countryCode: data.countryCode || null,
                city: data.city || null,
                region: data.regionName || null
              }
            } else {
              console.log(`[Geo] Lookup failed - IP: ${ip}, Status: ${data.status}, Message: ${data.message || 'unknown'}`)
            }
          } else if (!ip || ip === 'unknown' || ip === '') {
            // Fallback: Rufe IP-API ohne IP-Parameter auf, um Client-IP automatisch zu erkennen
            console.log(`[Geo] No IP in headers, trying auto-detection`)
            try {
              const res = await fetch(`https://ip-api.com/json/?fields=status,country,countryCode,city,regionName`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0'
                }
              })
              const data = await res.json()
              console.log(`[Geo Auto] Status: ${data.status}, Country: ${data.country}, City: ${data.city}`)
              if (data.status === 'success') {
                geo = {
                  country: data.country || null,
                  countryCode: data.countryCode || null,
                  city: data.city || null,
                  region: data.regionName || null
                }
              }
            } catch (fallbackError) {
              console.error('Geo auto-detection error:', fallbackError)
            }
          } else {
            console.log(`[Geo] IP invalid or private - IP: ${ip}`)
          }
        } catch (e) {
          console.error('Geo lookup error:', e, 'IP:', ip)
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
