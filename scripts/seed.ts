import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

interface CSVRow {
  frn: string;
  provider_id: string;
  brand_name: string;
  location_id: string;
  technology: string;
  max_advertised_download_speed: string;
  max_advertised_upload_speed: string;
  low_latency: string;
  business_residential_code: string;
  state_usps: string;
  block_geoid: string;
  h3_res8_id: string;
}

async function clearExistingData() {
  console.log('Clearing existing data...');
  await prisma.fiberProvider.deleteMany();
  console.log('Existing data cleared.');
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    await clearExistingData();
    
    const csvPath = path.join(process.cwd(), 'data', 'fiber_availability.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}`);
    }
    
    console.log(`Reading CSV file from ${csvPath}`);
    
    const records: CSVRow[] = [];
    const batchSize = 1000;
    let processedCount = 0;
    
    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({ 
          columns: true, 
          skip_empty_lines: true,
          delimiter: ','
        }))
        .on('data', (data: CSVRow) => {
          records.push(data);
          
          if (records.length >= batchSize) {
            processBatch([...records]);
            records.length = 0;
          }
        })
        .on('end', async () => {
          if (records.length > 0) {
            await processBatch(records);
          }
          console.log(`\nDatabase seeding completed! Total records processed: ${processedCount}`);
          resolve();
        })
        .on('error', (error) => {
          console.error('Error reading CSV:', error);
          reject(error);
        });
    });

    async function processBatch(batch: CSVRow[]) {
      try {
        const data = batch.map(row => ({
          frn: row.frn,
          providerId: row.provider_id,
          brandName: row.brand_name,
          locationId: row.location_id,
          technology: parseInt(row.technology, 10),
          maxAdvertisedDownloadSpeed: parseInt(row.max_advertised_download_speed, 10),
          maxAdvertisedUploadSpeed: parseInt(row.max_advertised_upload_speed, 10),
          lowLatency: parseInt(row.low_latency, 10),
          businessResidentialCode: row.business_residential_code,
          stateUsps: row.state_usps,
          blockGeoid: row.block_geoid,
          h3Res8Id: row.h3_res8_id,
        }));

        await prisma.fiberProvider.createMany({
          data,
          skipDuplicates: true,
        });

        processedCount += batch.length;
        process.stdout.write(`\rProcessed ${processedCount} records...`);
      } catch (error) {
        console.error('Error processing batch:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };