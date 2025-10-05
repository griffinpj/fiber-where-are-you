import { NextRequest, NextResponse } from 'next/server';
import { ProviderService } from '@/lib/services/provider';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const geoid = searchParams.get('geoid');
    
    if (!geoid) {
      return NextResponse.json(
        { error: 'GEOID parameter is required' },
        { status: 400 }
      );
    }

    const providers = await ProviderService.findProvidersByGeoid(geoid);
    const stats = await ProviderService.getProviderStats(geoid);

    return NextResponse.json({
      geoid,
      providers,
      stats,
      meta: {
        totalResults: providers.length,
        searchedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Search by GEOID API error:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred while searching' },
      { status: 500 }
    );
  }
}