# Fiber Where Are You?

A Next.js application that helps users find fiber internet providers available in their area using FCC broadband data.

## Features

- **Address Autocomplete**: Intelligent address suggestions as you type using multiple APIs
- **Address Search**: Enter any US address to find available fiber providers  
- **GEOID Conversion**: Automatically converts addresses to Census Block GEOIDs for precise location matching
- **Provider Information**: Displays download/upload speeds, technology types, and availability
- **Statistics**: Shows aggregated data about providers in the area
- **Responsive UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui components, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Infrastructure**: Docker Compose for local development

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

## Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd fiber-where-are-you
   npm install
   ```

2. **Start PostgreSQL database with Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration if needed
   ```

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

5. **Seed the database with FCC data**:
   ```bash
   npm run db:seed
   ```
   *Note: This will process the CSV file in the `data/` directory and may take several minutes depending on file size. The seeding process will:*
   - *Parse FCC broadband data from CSV format*
   - *Insert provider records into the database*
   - *Create indexes for optimal query performance*
   - *Display progress updates during processing*

6. **Start the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Alternative Setup (Production-like)

For a production-like setup using migrations:

1. **Deploy migrations** (instead of step 4 above):
   ```bash
   npm run db:migrate:deploy
   npm run db:generate
   ```

## API Endpoints

### `GET /api/autocomplete`
Get address suggestions for autocomplete.

**Query Parameters**:
- `q` (required): Search query (minimum 3 characters)
- `limit` (optional): Maximum number of suggestions (default: 5)

**Response**:
```json
{
  "suggestions": [
    {
      "formattedAddress": "123 Main St, Seattle, WA 98101",
      "components": {
        "street": "123 Main St",
        "city": "Seattle", 
        "state": "WA",
        "zipCode": "98101"
      },
      "source": "census"
    }
  ],
  "meta": {
    "query": "main",
    "count": 1,
    "sources": ["census"],
    "searchedAt": "2025-01-05T04:01:20.511Z"
  }
}
```

### `POST /api/search`
Search for fiber providers by address.

**Request Body**:
```json
{
  "address": "123 Main St, City, State 12345"
}
```

**Response**:
```json
{
  "address": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "zipCode": "12345",
    "full": "123 Main St, City, State 12345"
  },
  "geoid": {
    "blockGeoid": "123456789012345",
    "state": "12",
    "county": "345",
    "tract": "678901",
    "block": "2345"
  },
  "providers": [...],
  "stats": {...}
}
```

### `GET /api/stats`
Get provider statistics.

**Query Parameters**:
- `state` (optional): Filter by state code
- `geoid` (optional): Filter by specific GEOID

## Database Schema

The application uses a single `FiberProvider` model that mirrors the FCC broadband data structure:

- `blockGeoid`: 15-digit Census Block GEOID (primary search key)
- `brandName`: Provider brand name
- `technology`: Technology type (50 = Fiber)
- `maxAdvertisedDownloadSpeed` / `maxAdvertisedUploadSpeed`: Speed tiers in Mbps
- `businessResidentialCode`: Service availability (R/B/X)

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── search-form.tsx   # Address search form
│   ├── provider-results.tsx # Results display
│   └── error-message.tsx # Error handling
├── lib/                   # Utility libraries
│   ├── services/         # Business logic
│   │   ├── geocoding.ts  # Address to GEOID conversion
│   │   └── provider.ts   # Provider data queries
│   ├── config.ts         # Environment configuration
│   ├── db.ts             # Prisma client
│   └── utils.ts          # UI utilities
└── types/                # TypeScript definitions
```

## Development

- **Linting**: `npm run lint`
- **Type checking**: `npx tsc --noEmit`
- **Database management**:
  - **View database**: `npm run db:studio`
  - **Reset database**: `npm run db:migrate:reset`
  - **Re-seed data**: `npm run db:seed`
  - **Full reset**: `docker-compose down -v && docker-compose up -d && npm run db:migrate && npm run db:generate && npm run db:seed`

## Docker Commands

- **Start database**: `docker-compose up -d`
- **Stop database**: `docker-compose down`
- **Reset database with volumes**: `docker-compose down -v && docker-compose up -d`
- **View logs**: `docker-compose logs postgres`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations (development)
- `npm run db:migrate:deploy` - Deploy migrations (production)
- `npm run db:migrate:reset` - Reset and re-run all migrations
- `npm run db:push` - Push schema changes directly (development only)
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with FCC data

## Data Source & Seeding Process

This application uses FCC Form 477 broadband availability data. The CSV file should contain the following columns:

- `frn`, `provider_id`, `brand_name`, `location_id`
- `technology`, `max_advertised_download_speed`, `max_advertised_upload_speed`
- `low_latency`, `business_residential_code`, `state_usps`
- `block_geoid`, `h3_res8_id`

### Seeding Process Details

The `npm run db:seed` command executes `scripts/seed.ts` which:

1. **Reads CSV data** from the `data/` directory
2. **Processes records in batches** for memory efficiency
3. **Filters for fiber technology** (technology = 50)
4. **Validates data integrity** before insertion
5. **Creates database indexes** for optimal query performance
6. **Reports progress** with status updates

**Performance Notes:**
- Large datasets (1M+ records) may take 10-30 minutes to process
- The process uses batch inserts for optimal performance
- Memory usage is optimized through streaming CSV parsing
- Database constraints ensure data integrity

## Address Autocomplete

The app supports multiple autocomplete sources for the best user experience:

### Free Options (No API Key Required):
- **US Census Bureau**: Free geocoding suggestions
- **Fallback Suggestions**: Built-in demo addresses for testing

### Premium Options (API Key Required):
- **Google Places API**: Excellent coverage and accuracy
- **Mapbox Geocoding**: Good performance and global coverage

### Configuration:
Add API keys to your `.env` file to enable premium autocomplete:
```bash
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
MAPBOX_ACCESS_TOKEN="your-mapbox-access-token"
```

Without API keys, the app uses free Census Bureau API + fallback suggestions.

## Geocoding

Address to GEOID conversion uses the US Census Bureau's free geocoding API, which provides:
- No API key required
- 2020 Census geography data
- Accurate block-level resolution
- Built-in address standardization

## License

MIT