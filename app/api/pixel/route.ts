import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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
        const forwardedFor = request.headers.get('x-forwarded-for')
        const ip = forwardedFor?.split(',')[0] || 'unknown'
        
        let geo = null
        try {
          if (ip !== 'unknown' && !ip.startsWith('192.168')) {
            const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`)
            const data = await res.json()
            if (data.status === 'success') {
              geo = {
                country: data.country,
                countryCode: data.countryCode,
                city: data.city,
                region: data.regionName
              }
            }
          }
        } catch (e) {}

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
    },
  })
}