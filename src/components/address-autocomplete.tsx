'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { AddressSuggestion } from '@/lib/services/autocomplete';

interface AddressAutocompleteProps {
  onSelect: (address: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
}

export function AddressAutocomplete({ 
  onSelect, 
  placeholder = "Enter your address...", 
  disabled = false,
  initialValue = ""
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(searchQuery)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Autocomplete fetch failed:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedFetch = useCallback((searchQuery: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);
  }, [fetchSuggestions]);

  useEffect(() => {
    if (query && query.length >= 3) {
      debouncedFetch(query);
      setOpen(true);
    } else if (query.length < 3) {
      setOpen(false);
      setSuggestions([]);
      setHasSearched(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debouncedFetch]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    // Clear the "just selected" flag when user starts typing again
    if (justSelected) {
      setJustSelected(false);
    }
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.formattedAddress);
    setOpen(false);
    setHasSearched(false);
    setJustSelected(true);
    onSelect(suggestion.formattedAddress);
    
    // Keep focus on input after selection but don't reopen dropdown
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !open && query) {
      onSelect(query);
    }
    // Don't close dropdown on arrow keys - let Command component handle navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
    }
  };

  const handleFocus = () => {
    // Don't reopen dropdown immediately after selection
    if (query.length >= 3 && hasSearched && !justSelected) {
      setOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only close if we're not clicking on a suggestion
    const relatedTarget = e.relatedTarget as Element;
    if (!relatedTarget?.closest('[role="option"]')) {
      // Delay to allow for clicks on suggestions
      setTimeout(() => {
        setOpen(false);
      }, 150);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google':
        return '🅖';
      case 'mapbox':
        return '🗺️';
      default:
        return '📍';
    }
  };

  // Show dropdown when:
  // 1. Input is focused AND query >= 3 chars AND (loading OR has searched)
  // 2. Don't show immediately after selection
  // 3. This prevents constant opening/closing and maintains focus
  const shouldShowDropdown = open && query.length >= 3 && (isLoading || hasSearched) && !justSelected;

  return (
    <div className="space-y-2">
      <Label htmlFor="address-autocomplete">Address</Label>
      <Popover open={shouldShowDropdown} onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
            <Input
              ref={inputRef}
              id="address-autocomplete"
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              className="pl-10 pr-10"
              autoComplete="off"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 animate-spin pointer-events-none" />
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-full p-0" 
          align="start"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          onOpenAutoFocus={(e) => {
            // Prevent focus from moving to popover content
            e.preventDefault();
          }}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Searching addresses...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <CommandEmpty>
                  <div className="flex items-center justify-center py-6">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {query.length >= 3 ? 'No addresses found' : 'Type to search addresses'}
                    </span>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.formattedAddress}-${index}`}
                      value={suggestion.formattedAddress}
                      onMouseDown={(e) => {
                        // Prevent input blur when clicking suggestion
                        e.preventDefault();
                      }}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {suggestion.formattedAddress}
                          </p>
                          {suggestion.components.city && suggestion.components.state && (
                            <p className="text-xs text-muted-foreground">
                              {suggestion.components.city}, {suggestion.components.state}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {getSourceIcon(suggestion.source)} {suggestion.source}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {query && query.length > 0 && query.length < 3 && (
        <p className="text-xs text-muted-foreground">
          Type at least 3 characters for address suggestions
        </p>
      )}
    </div>
  );
}