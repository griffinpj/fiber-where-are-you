import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Add some test data
    const testProvider = await db.fiberProvider.upsert({
      where: {
        id: 'test-provider-1',
      },
      update: {},
      create: {
        id: 'test-provider-1',
        frn: '0022491120',
        providerId: '310017',
        brandName: 'WIFIBER',
        locationId: '1288951601',
        technology: 50,
        maxAdvertisedDownloadSpeed: 1000,
        maxAdvertisedUploadSpeed: 1000,
        lowLatency: 1,
        businessResidentialCode: 'X',
        stateUsps: 'WA',
        blockGeoid: '530750009002153',
        h3Res8Id: '88288a75c7fffff',
      },
    });

    const count = await db.fiberProvider.count();
    
    return NextResponse.json({
      message: 'Test endpoint working',
      testProvider,
      totalProviders: count,
      databaseConnected: true,
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        databaseConnected: false,
      },
      { status: 500 }
    );
  }
}