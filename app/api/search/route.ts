import { NextRequest, NextResponse } from 'next/server';
import { GeocodingService } from '@/lib/services/geocoding';
import { ProviderService } from '@/lib/services/provider';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required and must be a string' },
        { status: 400 }
      );
    }

    const geoidResult = await GeocodingService.addressToGeoid(address);
    
    if (!geoidResult) {
      return NextResponse.json(
        { error: 'Could not find GEOID for the provided address' },
        { status: 404 }
      );
    }

    const providers = await ProviderService.findProvidersByGeoid(geoidResult.blockGeoid);
    
    const stats = await ProviderService.getProviderStats(geoidResult.blockGeoid);

    return NextResponse.json({
      address: GeocodingService.parseAddress(address),
      geoid: geoidResult,
      providers,
      stats,
      meta: {
        totalResults: providers.length,
        searchedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred while searching' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  
  if (!address) {
    return NextResponse.json(
      { error: 'Address query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const geoidResult = await GeocodingService.addressToGeoid(address);
    
    if (!geoidResult) {
      return NextResponse.json(
        { error: 'Could not find GEOID for the provided address' },
        { status: 404 }
      );
    }

    const providers = await ProviderService.findProvidersByGeoid(geoidResult.blockGeoid);
    
    const stats = await ProviderService.getProviderStats(geoidResult.blockGeoid);

    return NextResponse.json({
      address: GeocodingService.parseAddress(address),
      geoid: geoidResult,
      providers,
      stats,
      meta: {
        totalResults: providers.length,
        searchedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred while searching' },
      { status: 500 }
    );
  }
}