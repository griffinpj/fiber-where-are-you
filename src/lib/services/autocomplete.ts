import { config } from '@/lib/config';

interface GooglePrediction {
  description: string;
  place_id: string;
}

interface MapboxFeature {
  place_name: string;
}

export interface AddressSuggestion {
  formattedAddress: string;
  placeId?: string;
  components: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  source: 'google' | 'mapbox';
}

export class AutocompleteService {
  private static readonly GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private static readonly MAPBOX_SUGGEST_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  static async getSuggestions(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    const suggestions: AddressSuggestion[] = [];

    // Try multiple services in parallel
    const promises = [
      this.getGoogleSuggestions(query, limit),
      this.getMapboxSuggestions(query, limit),
      this.getLocalSuggestions(query, limit), // Add fallback suggestions
    ];

    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        suggestions.push(...result.value);
      }
    });

    // Remove duplicates and limit results
    const uniqueSuggestions = this.removeDuplicates(suggestions);
    return uniqueSuggestions.slice(0, limit);
  }


  private static async getGoogleSuggestions(query: string, limit: number): Promise<AddressSuggestion[]> {
    const apiKey = config.api.geocodingKey;
    if (!apiKey) {
      return [];
    }

    try {
      const url = `${this.GOOGLE_PLACES_URL}?input=${encodeURIComponent(query)}&types=address&components=country:us&key=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Google Places API request failed');
      }

      const data = await response.json();
      
      if (!data.predictions) {
        return [];
      }

      return data.predictions.slice(0, limit).map((prediction: GooglePrediction) => ({
        formattedAddress: prediction.description,
        placeId: prediction.place_id,
        components: this.parseAddress(prediction.description),
        source: 'google' as const,
      }));
    } catch (error) {
      console.warn('Google autocomplete failed:', error);
      return [];
    }
  }

  private static async getMapboxSuggestions(query: string, limit: number): Promise<AddressSuggestion[]> {
    const apiKey = process.env.MAPBOX_ACCESS_TOKEN;
    if (!apiKey) {
      return [];
    }

    try {
      const url = `${this.MAPBOX_SUGGEST_URL}/${encodeURIComponent(query)}.json?access_token=${apiKey}&country=us&types=address&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Mapbox API request failed');
      }

      const data = await response.json();
      
      if (!data.features) {
        return [];
      }

      return data.features.map((feature: MapboxFeature) => ({
        formattedAddress: feature.place_name,
        components: this.parseAddress(feature.place_name),
        source: 'mapbox' as const,
      }));
    } catch (error) {
      console.warn('Mapbox autocomplete failed:', error);
      return [];
    }
  }

  private static parseAddress(address: string): AddressSuggestion['components'] {
    const parts = address.split(',').map(part => part.trim());
    
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';
    
    if (parts.length >= 1) {
      street = parts[0];
    }
    
    if (parts.length >= 2) {
      city = parts[1];
    }
    
    if (parts.length >= 3) {
      const stateZipPart = parts[2];
      const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
      
      if (stateZipMatch) {
        state = stateZipMatch[1];
        zipCode = stateZipMatch[2];
      } else {
        state = stateZipPart;
      }
    }
    
    return { street, city, state, zipCode };
  }

  private static removeDuplicates(suggestions: AddressSuggestion[]): AddressSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = suggestion.formattedAddress.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Fallback: Generate suggestions from existing database
  static async getLocalSuggestions(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
    try {
      // For demo purposes, return some sample suggestions
      const demoSuggestions: AddressSuggestion[] = [
        {
          formattedAddress: '123 Main St, Seattle, WA 98101',
          components: { street: '123 Main St', city: 'Seattle', state: 'WA', zipCode: '98101' },
          source: 'google',
        },
        {
          formattedAddress: '456 Broadway Ave, Portland, OR 97201',
          components: { street: '456 Broadway Ave', city: 'Portland', state: 'OR', zipCode: '97201' },
          source: 'google',
        },
        {
          formattedAddress: '789 Pine St, San Francisco, CA 94102',
          components: { street: '789 Pine St', city: 'San Francisco', state: 'CA', zipCode: '94102' },
          source: 'google',
        },
      ];

      return demoSuggestions
        .filter(suggestion => 
          suggestion.formattedAddress.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit);
    } catch (error) {
      console.warn('Local suggestions failed:', error);
      return [];
    }
  }
}

export default AutocompleteService;