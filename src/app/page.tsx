'use client';

import { useState } from 'react';
import { SearchForm } from '@/components/search-form';
import { ProviderResults } from '@/components/provider-results';
import { ErrorMessage } from '@/components/error-message';

type SearchState = 'idle' | 'loading' | 'success' | 'error';

interface SearchResults {
  address: {
    full: string;
    city: string;
    state: string;
  };
  providers: any[];
  stats: {
    totalProviders: number;
    averageDownloadSpeed: number;
    averageUploadSpeed: number;
    topProviders: Array<{ name: string; count: number }>;
  };
}

export default function Home() {
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string>('');

  const handleSearch = async (address: string) => {
    setSearchState('loading');
    setError('');
    setSearchResults(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
      setSearchState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSearchState('error');
    }
  };

  const handleRetry = () => {
    setSearchState('idle');
    setError('');
    setSearchResults(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Fiber Where Are You?
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Find fiber internet providers available in your area
          </p>
        </div>
        
        <div className="space-y-8">
          <SearchForm 
            onSearch={handleSearch} 
            isLoading={searchState === 'loading'} 
          />
          
          {searchState === 'error' && (
            <ErrorMessage message={error} onRetry={handleRetry} />
          )}
          
          {searchState === 'success' && searchResults && (
            <ProviderResults results={searchResults} />
          )}
        </div>
      </div>
    </main>
  );
}