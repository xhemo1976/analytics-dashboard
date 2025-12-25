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
        // PRIORITÄT 1: IP direkt vom Client (vom Tracker gesendet) - das ist die zuverlässigste Methode
        const clientSentIp = searchParams.get('ip')
        
        // PRIORITÄT 2: IP-Adresse aus verschiedenen Headern extrahieren (für Proxies/CDNs)
        const forwardedFor = request.headers.get('x-forwarded-for')
        const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
        const realIp = request.headers.get('x-real-ip')
        const clientIp = request.headers.get('x-client-ip')
        const vercelIp = request.headers.get('x-vercel-forwarded-for') // Vercel
        
        // WICHTIG: Bei x-forwarded-for ist die LETZTE IP die echte Client-IP (nicht die erste!)
        // Format: "proxy1, proxy2, client-ip"
        let forwardedIp = null
        if (forwardedFor) {
          const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip)
          forwardedIp = ips.length > 0 ? ips[ips.length - 1] : null // Letzte IP = Client-IP
        }
        
        // Versuche auch die IP direkt aus dem Request-Objekt zu bekommen (falls Next.js das unterstützt)
        // @ts-ignore - ip property might exist in some Next.js versions
        const requestIp = request.ip || null
        
        // Priorität: Client-gesendete IP > cf-connecting-ip > x-real-ip > request.ip > x-vercel-forwarded-for > x-forwarded-for (LETZTE IP) > x-client-ip
        let ip = clientSentIp || cfConnectingIp || realIp || requestIp || vercelIp || forwardedIp || clientIp || null
        
        // Debug: Log alle Header für Diagnose
        console.log(`[IP Debug] cf-connecting-ip: ${cfConnectingIp}, x-real-ip: ${realIp}, x-vercel-forwarded-for: ${vercelIp}, x-forwarded-for: ${forwardedFor}, x-client-ip: ${clientIp}, Final IP: ${ip}`)
        
        let geo = null
        try {
          // Versuche zuerst mit der erkannten IP
          if (ip && ip !== 'unknown' && ip !== '' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.16')) {
            // Verwende HTTPS für die IP-API mit spezifischer IP
            const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
              headers: {
                'User-Agent': 'Mozilla/5.0'
              },
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
              
              // Prüfe ob das Ergebnis plausibel ist (nicht Ashburn wenn wir in Deutschland sind)
              // Falls Ashburn/USA erkannt wird, versuche Fallback
              if (geo.country === 'United States' && geo.city === 'Ashburn') {
                console.log(`[Geo Warning] Suspicious result (Ashburn/USA), trying fallback...`)
                geo = null // Setze auf null, um Fallback zu triggern
              }
            } else {
              console.log(`[Geo Failed] IP: ${ip}, Status: ${data.status}, Message: ${data.message || 'unknown'}`)
            }
          }
          
          // Fallback: Verwende einen Service, der die IP direkt aus dem Request erkennt
          // WICHTIG: Diese Services erkennen die IP aus den Headern des Requests
          if (!geo) {
            try {
              // Versuche ipapi.co - diese API liest die IP aus X-Forwarded-For Header
              const res = await fetch(`https://ipapi.co/json/`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  // Übergebe die Client-IP in den Headern
                  'X-Forwarded-For': forwardedFor || ip || '',
                  'CF-Connecting-IP': cfConnectingIp || '',
                  'X-Real-IP': realIp || ''
                },
                signal: AbortSignal.timeout(5000)
              })
              const data = await res.json()
              
              if (data.country_name && !data.error) {
                geo = {
                  country: data.country_name || null,
                  countryCode: data.country_code || null,
                  city: data.city || null,
                  region: data.region || null
                }
                console.log(`[Geo Fallback Success] Country: ${geo.country}, City: ${geo.city}`)
              } else {
                console.log(`[Geo Fallback Failed] Error: ${data.error || 'unknown'}`)
              }
            } catch (fallbackError) {
              console.error('[Geo Fallback Error]:', fallbackError)
            }
          }
          
          // Zweiter Fallback: ip-api.com ohne IP (erkennt automatisch)
          if (!geo) {
            try {
              const res = await fetch(`https://ip-api.com/json/?fields=status,country,countryCode,city,regionName`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  'X-Forwarded-For': forwardedFor || ip || ''
                },
                signal: AbortSignal.timeout(5000)
              })
              const data = await res.json()
              
              if (data.status === 'success' && data.country !== 'United States') {
                geo = {
                  country: data.country || null,
                  countryCode: data.countryCode || null,
                  city: data.city || null,
                  region: data.regionName || null
                }
                console.log(`[Geo Fallback2 Success] Country: ${geo.country}, City: ${geo.city}`)
              }
            } catch (fallback2Error) {
              console.error('[Geo Fallback2 Error]:', fallback2Error)
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
