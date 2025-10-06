'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressAutocomplete } from '@/components/address-autocomplete';

interface SearchFormProps {
  onSearch: (address: string) => void;
  isLoading?: boolean;
}

export function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onSearch(address.trim());
    }
  };

  const handleAddressSelect = (selectedAddress: string) => {
    setAddress(selectedAddress);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Find Fiber Providers</CardTitle>
        <CardDescription>
          Enter your address to discover fiber internet options in your area
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AddressAutocomplete
            onSelect={handleAddressSelect}
            placeholder="123 Main St, City, State 12345"
            disabled={isLoading}
            initialValue={address}
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !address.trim()}
          >
            {isLoading ? 'Searching...' : 'Search Providers'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}