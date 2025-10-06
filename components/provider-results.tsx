'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderSearchResult } from '@/types';

interface ProviderResultsProps {
  results: {
    address: {
      full: string;
      city: string;
      state: string;
    };
    providers: ProviderSearchResult[];
    stats: {
      totalProviders: number;
      averageDownloadSpeed: number;
      averageUploadSpeed: number;
      topProviders: Array<{ name: string; count: number }>;
    };
  };
}

export function ProviderResults({ results }: ProviderResultsProps) {
  const { address, providers, stats } = results;

  if (!providers || providers.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-2">No fiber providers found</p>
            <p>for {address.full}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Search Results for</CardTitle>
          <CardDescription className="text-lg">{address.full}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{providers.length}</p>
              <p className="text-sm text-muted-foreground">Unique Providers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.averageDownloadSpeed} Mbps</p>
              <p className="text-sm text-muted-foreground">Avg Download</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.averageUploadSpeed} Mbps</p>
              <p className="text-sm text-muted-foreground">Avg Upload</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{address.state}</p>
              <p className="text-sm text-muted-foreground">State</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {providers.map((result, index) => (
          <Card key={`${result.provider.id}-${index}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{result.provider.brandName}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{result.technology}</Badge>
                  {result.planCount && result.planCount > 1 && (
                    <Badge variant="outline">{result.planCount} plans</Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                Provider ID: {result.provider.providerId} • FRN: {result.provider.frn}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {typeof result.speeds.download === 'number' 
                      ? `${result.speeds.download} Mbps`
                      : `${result.speeds.download.min}-${result.speeds.download.max} Mbps`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Download Speed</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {typeof result.speeds.upload === 'number' 
                      ? `${result.speeds.upload} Mbps`
                      : `${result.speeds.upload.min}-${result.speeds.upload.max} Mbps`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Upload Speed</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{result.availability}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.provider.lowLatency ? 'Low Latency' : 'Standard Latency'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}