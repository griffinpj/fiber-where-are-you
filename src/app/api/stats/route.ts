import { NextRequest, NextResponse } from 'next/server';
import { ProviderService } from '@/lib/services/provider';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const geoid = searchParams.get('geoid');

    if (state) {
      const providers = await ProviderService.findProvidersByState(state);
      return NextResponse.json({
        state: state.toUpperCase(),
        providers,
        count: providers.length,
      });
    }

    const stats = await ProviderService.getProviderStats(geoid || undefined);

    return NextResponse.json({
      ...stats,
      scope: geoid ? 'location' : 'national',
      geoid: geoid || null,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred while fetching stats' },
      { status: 500 }
    );
  }
}