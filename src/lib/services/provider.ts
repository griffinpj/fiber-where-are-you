import { db } from '@/lib/db';
import { FiberProvider, ProviderSearchResult } from '@/types';

export class ProviderService {
  static async findProvidersByGeoid(blockGeoid: string): Promise<ProviderSearchResult[]> {
    try {
      const providers = await db.fiberProvider.findMany({
        where: {
          blockGeoid: blockGeoid,
          maxAdvertisedDownloadSpeed: {
            gte: 900,
          },
          maxAdvertisedUploadSpeed: {
            gte: 900,
          },
        },
        orderBy: [
          { brandName: 'asc' },
          { maxAdvertisedDownloadSpeed: 'desc' },
        ],
      });

      // Group providers by providerId (or brandName as fallback)
      const groupedProviders = new Map<string, typeof providers>();
      
      providers.forEach(provider => {
        const key = provider.providerId || provider.brandName;
        if (!groupedProviders.has(key)) {
          groupedProviders.set(key, []);
        }
        groupedProviders.get(key)!.push(provider);
      });

      // Convert grouped providers to search results with speed ranges
      return Array.from(groupedProviders.entries()).map(([key, providerGroup]) => {
        const representative = providerGroup[0]; // Use first provider as representative
        
        // Calculate speed ranges
        const downloadSpeeds = providerGroup.map(p => p.maxAdvertisedDownloadSpeed);
        const uploadSpeeds = providerGroup.map(p => p.maxAdvertisedUploadSpeed);
        
        const minDownload = Math.min(...downloadSpeeds);
        const maxDownload = Math.max(...downloadSpeeds);
        const minUpload = Math.min(...uploadSpeeds);
        const maxUpload = Math.max(...uploadSpeeds);

        return {
          provider: representative,
          speeds: {
            download: maxDownload === minDownload ? maxDownload : { min: minDownload, max: maxDownload },
            upload: maxUpload === minUpload ? maxUpload : { min: minUpload, max: maxUpload },
          },
          technology: this.getTechnologyName(representative.technology),
          availability: this.getAvailabilityType(representative.businessResidentialCode),
          planCount: providerGroup.length, // Number of different plans/speeds
        };
      });
    } catch (error) {
      console.error('Error finding providers by GEOID:', error);
      return [];
    }
  }

  static async findProvidersByState(state: string): Promise<string[]> {
    try {
      const providers = await db.fiberProvider.groupBy({
        by: ['brandName'],
        where: {
          stateUsps: state.toUpperCase(),
        },
        orderBy: {
          brandName: 'asc',
        },
      });

      return providers.map(provider => provider.brandName);
    } catch (error) {
      console.error('Error finding providers by state:', error);
      return [];
    }
  }

  static async getProviderStats(blockGeoid?: string) {
    try {
      const whereClause = blockGeoid ? { blockGeoid } : {};
      
      const [totalProviders, avgDownloadSpeed, avgUploadSpeed, topProviders] = await Promise.all([
        db.fiberProvider.count({
          where: whereClause,
        }),
        db.fiberProvider.aggregate({
          _avg: {
            maxAdvertisedDownloadSpeed: true,
          },
          where: whereClause,
        }),
        db.fiberProvider.aggregate({
          _avg: {
            maxAdvertisedUploadSpeed: true,
          },
          where: whereClause,
        }),
        db.fiberProvider.groupBy({
          by: ['brandName'],
          where: whereClause,
          _count: {
            brandName: true,
          },
          orderBy: {
            _count: {
              brandName: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      return {
        totalProviders,
        averageDownloadSpeed: Math.round(avgDownloadSpeed._avg.maxAdvertisedDownloadSpeed || 0),
        averageUploadSpeed: Math.round(avgUploadSpeed._avg.maxAdvertisedUploadSpeed || 0),
        topProviders: topProviders.map(provider => ({
          name: provider.brandName,
          count: provider._count.brandName,
        })),
      };
    } catch (error) {
      console.error('Error getting provider stats:', error);
      return {
        totalProviders: 0,
        averageDownloadSpeed: 0,
        averageUploadSpeed: 0,
        topProviders: [],
      };
    }
  }

  private static mapToSearchResult(provider: FiberProvider): ProviderSearchResult {
    return {
      provider,
      speeds: {
        download: provider.maxAdvertisedDownloadSpeed,
        upload: provider.maxAdvertisedUploadSpeed,
      },
      technology: this.getTechnologyName(provider.technology),
      availability: this.getAvailabilityType(provider.businessResidentialCode),
    };
  }

  private static getTechnologyName(technology: number): string {
    const technologyMap: Record<number, string> = {
      10: 'Asymmetric DSL',
      20: 'Symmetric DSL',
      30: 'Other Copper Wireline',
      40: 'Cable Modem - DOCSIS 3.0',
      41: 'Cable Modem - DOCSIS 3.1',
      42: 'Cable Modem - Other',
      43: 'Cable Modem - DOCSIS 3.1 and Other',
      50: 'Optical Carrier / Fiber to the End User',
      60: 'Satellite',
      70: 'Terrestrial Fixed Wireless',
      71: 'Licensed Terrestrial Fixed Wireless',
      72: 'Licensed-by-Rule Terrestrial Fixed Wireless',
      80: 'Terrestrial Mobile Wireless',
      90: 'Electric Power Line',
      0: 'All Other',
    };

    return technologyMap[technology] || `Technology ${technology}`;
  }

  private static getAvailabilityType(code: string): string {
    switch (code.toUpperCase()) {
      case 'R':
        return 'Residential Only';
      case 'B':
        return 'Business Only';
      case 'X':
        return 'Residential and Business';
      default:
        return 'Unknown';
    }
  }
}

export default ProviderService;