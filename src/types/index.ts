export interface FiberProvider {
  id: string;
  frn: string;
  providerId: string;
  brandName: string;
  locationId: string;
  technology: number;
  maxAdvertisedDownloadSpeed: number;
  maxAdvertisedUploadSpeed: number;
  lowLatency: number;
  businessResidentialCode: string;
  stateUsps: string;
  blockGeoid: string;
  h3Res8Id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  full: string;
}

export interface GeoidLookupResult {
  blockGeoid: string;
  state: string;
  county: string;
  tract: string;
  block: string;
}

export interface ProviderSearchResult {
  provider: FiberProvider;
  speeds: {
    download: number | { min: number; max: number };
    upload: number | { min: number; max: number };
  };
  technology: string;
  availability: string;
  planCount?: number;
}