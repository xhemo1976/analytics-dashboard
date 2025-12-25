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
        let ip = cfConnectingIp || realIp || (forwardedFor?.split(',')[0]?.trim()) || clientIp || 'unknown'
        
        // Fallback: Versuche IP aus Next.js Request zu bekommen
        if (ip === 'unknown' || ip === '') {
          const url = new URL(request.url)
          ip = url.searchParams.get('ip') || 'unknown'
        }
        
        let geo = null
        try {
          // Nur Geolokalisierung durchführen wenn IP gültig ist
          if (ip !== 'unknown' && ip !== '' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.16')) {
            // Verwende HTTPS für die IP-API
            const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`, {
              headers: {
                'User-Agent': 'Mozilla/5.0'
              }
            })
            const data = await res.json()
            if (data.status === 'success' && data.city) {
              // Debug-Logging für mobile Geräte
              if (deviceType === 'mobile') {
                console.log(`[Mobile] IP: ${ip}, City: ${data.city}, Country: ${data.country}, Region: ${data.regionName}`)
              }
              geo = {
                country: data.country,
                countryCode: data.countryCode,
                city: data.city,
                region: data.regionName
              }
            } else if (deviceType === 'mobile') {
              console.log(`[Mobile] Geo lookup failed - IP: ${ip}, Status: ${data.status}, Response:`, JSON.stringify(data))
            }
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
