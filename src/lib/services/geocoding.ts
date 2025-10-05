import { Address, GeoidLookupResult } from '@/types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export class GeocodingService {
  private static readonly CENSUS_GEOCODING_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

  static async addressToCoordinates(address: string): Promise<Coordinates | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.CENSUS_GEOCODING_URL}?address=${encodedAddress}&benchmark=2020&vintage=2020&format=json`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.result?.addressMatches && data.result.addressMatches.length > 0) {
        const match = data.result.addressMatches[0];
        return {
          lat: parseFloat(match.coordinates.y),
          lng: parseFloat(match.coordinates.x),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  static async addressToGeoid(address: string): Promise<GeoidLookupResult | null> {
    try {
      // Step 1: Try direct address to GEOID (Census geocoding)
      const directResult = await this.directAddressToGeoid(address);
      if (directResult) {
        return directResult;
      }

      // Step 2: If direct fails, use lat/long approach (more reliable)
      console.log('Direct address lookup failed, trying lat/long approach...');
      
      // First get coordinates from Google Places (since we have the API key)
      const coordinates = await this.getCoordinatesFromGoogle(address);
      if (!coordinates) {
        // Fallback to Census geocoding for coordinates
        const censusCoords = await this.addressToCoordinates(address);
        if (!censusCoords) {
          return null;
        }
        return this.coordinatesToGeoid(censusCoords.lng, censusCoords.lat);
      }

      return this.coordinatesToGeoid(coordinates.lng, coordinates.lat);
    } catch (error) {
      console.error('GEOID lookup error:', error);
      return null;
    }
  }

  private static async directAddressToGeoid(address: string): Promise<GeoidLookupResult | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.CENSUS_GEOCODING_URL}?address=${encodedAddress}&benchmark=2020&vintage=2020&format=json&layers=all`;
      
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.result?.addressMatches && data.result.addressMatches.length > 0) {
        const match = data.result.addressMatches[0];
        const geographies = match.geographies;
        
        if (geographies && geographies['2020 Census Blocks']) {
          const block = geographies['2020 Census Blocks'][0];
          const blockGeoid = block.GEOID;
          
          return {
            blockGeoid,
            state: blockGeoid.substring(0, 2),
            county: blockGeoid.substring(2, 5),
            tract: blockGeoid.substring(5, 11),
            block: blockGeoid.substring(11, 15),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Direct address to GEOID failed:', error);
      return null;
    }
  }

  private static async getCoordinatesFromGoogle(address: string): Promise<Coordinates | null> {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return null;
      }

      // Use Google Geocoding API (different from Places API)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Google geocoding failed:', error);
      return null;
    }
  }

  private static async coordinatesToGeoid(lng: number, lat: number): Promise<GeoidLookupResult | null> {
    try {
      const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=2020&vintage=2020&format=json&layers=all`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.result?.geographies && data.result.geographies['Census Blocks']) {
        const block = data.result.geographies['Census Blocks'][0];
        const blockGeoid = block.GEOID;
        
        return {
          blockGeoid,
          state: blockGeoid.substring(0, 2),
          county: blockGeoid.substring(2, 5),
          tract: blockGeoid.substring(5, 11),
          block: blockGeoid.substring(11, 15),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Coordinates to GEOID error:', error);
      return null;
    }
  }

  static parseAddress(addressString: string): Address {
    const parts = addressString.split(',').map(part => part.trim());
    
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
    
    return {
      street,
      city,
      state,
      zipCode,
      full: addressString,
    };
  }
}

export default GeocodingService;