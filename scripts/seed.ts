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
    
    const dataDir = path.join(process.cwd(), 'data');
    const stateFolders = fs.readdirSync(dataDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (stateFolders.length === 0) {
      throw new Error('No state folders found in data directory');
    }
    
    console.log(`Found state folders: ${stateFolders.join(', ')}`);
    
    let totalProcessedCount = 0;
    
    for (const stateFolder of stateFolders) {
      const csvPath = path.join(dataDir, stateFolder, 'fiber_to_the_premises.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.log(`Skipping ${stateFolder}: CSV file not found at ${csvPath}`);
        continue;
      }
      
      console.log(`\nProcessing ${stateFolder.toUpperCase()} data from ${csvPath}`);
      
      const records: CSVRow[] = [];
      const batchSize = 1000;
      let stateProcessedCount = 0;
      
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(parse({ 
            columns: true, 
            skip_empty_lines: true,
            delimiter: ','
          }))
          .on('data', (data: CSVRow) => {
            records.push(data);
            
            if (records.length >= batchSize) {
              processBatch([...records], stateFolder);
              records.length = 0;
            }
          })
          .on('end', async () => {
            if (records.length > 0) {
              await processBatch(records, stateFolder);
            }
            console.log(`\n${stateFolder.toUpperCase()} completed! Records processed: ${stateProcessedCount}`);
            totalProcessedCount += stateProcessedCount;
            resolve();
          })
          .on('error', (error) => {
            console.error(`Error reading CSV for ${stateFolder}:`, error);
            reject(error);
          });
      });
      
      async function processBatch(batch: CSVRow[], state: string) {
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

          stateProcessedCount += batch.length;
          process.stdout.write(`\r${state.toUpperCase()}: Processed ${stateProcessedCount} records...`);
        } catch (error) {
          console.error(`Error processing batch for ${state}:`, error);
          throw error;
        }
      }
    }
    
    console.log(`\nDatabase seeding completed! Total records processed across all states: ${totalProcessedCount}`);
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
