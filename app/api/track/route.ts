import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, urlPath, referrer, userAgent, source, medium, campaign } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const website = await prisma.website.findUnique({
      where: { domain },
    })

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      )
    }

    const event = await prisma.event.create({
      data: {
        websiteId: website.id,
        urlPath: urlPath || '/',
        referrer: referrer || null,
        userAgent: userAgent || null,
        source: source || null,
        medium: medium || null,
        campaign: campaign || null,
      },
    })

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201 })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}