import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import AdmZip from 'adm-zip';

interface SpecData {
  [state: string]: string;
}

async function downloadFile(url: string, outputPath: string, cookies?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath);
    
    console.log(`Attempting to download: ${url}`);
    
    // Choose the appropriate module based on the protocol
    const isHttps = url.startsWith('https:');
    const httpModule = isHttps ? https : http;
    
    const headers: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const request = httpModule.get(url, {
      timeout: 60000, // 60 second timeout
      headers
    }, (response) => {
      console.log(`Response status: ${response.statusCode}`);
      console.log(`Response headers:`, response.headers);
      
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`Redirecting to: ${redirectUrl}`);
          
          // Extract cookies from the redirect response
          const setCookieHeaders = response.headers['set-cookie'];
          let cookieString = '';
          if (setCookieHeaders) {
            cookieString = setCookieHeaders
              .map(cookie => cookie.split(';')[0])
              .join('; ');
          }
          
          file.close();
          fs.unlink(outputPath, () => {});
          
          // Add delay to seem more human-like
          setTimeout(() => {
            downloadFile(redirectUrl, outputPath, cookieString).then(resolve).catch(reject);
          }, 2000);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(outputPath, () => {});
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rDownloading: ${percent}% (${downloadedSize}/${totalSize} bytes)`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`\nDownload completed: ${outputPath}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete the file on error
        reject(err);
      });
    });
    
    request.on('timeout', () => {
      request.destroy();
      file.close();
      fs.unlink(outputPath, () => {});
      reject(new Error('Download timeout'));
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function extractZipAndMoveCSV(zipPath: string, stateFolder: string): Promise<void> {
  try {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    // Find CSV file in the zip
    const csvEntry = zipEntries.find(entry => 
      entry.entryName.toLowerCase().endsWith('.csv')
    );
    
    if (!csvEntry) {
      throw new Error(`No CSV file found in ${zipPath}`);
    }
    
    // Create state directory if it doesn't exist
    const stateDirPath = path.join(process.cwd(), 'data', stateFolder);
    if (!fs.existsSync(stateDirPath)) {
      fs.mkdirSync(stateDirPath, { recursive: true });
    }
    
    // Extract and rename CSV
    const csvOutputPath = path.join(stateDirPath, 'fiber_to_the_premises.csv');
    fs.writeFileSync(csvOutputPath, csvEntry.getData());
    
    console.log(`Extracted and moved CSV for ${stateFolder.toUpperCase()}`);
    
    // Clean up zip file
    fs.unlinkSync(zipPath);
  } catch (error) {
    console.error(`Error extracting zip for ${stateFolder}:`, error);
    throw error;
  }
}

async function establishSession(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('Establishing session with FCC site...');
    
    const request = https.get('https://broadbandmap.fcc.gov/', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    }, (response) => {
      console.log(`Session establishment status: ${response.statusCode}`);
      
      // Extract cookies from the session
      const setCookieHeaders = response.headers['set-cookie'];
      let cookieString = '';
      if (setCookieHeaders) {
        cookieString = setCookieHeaders
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }
      
      // Consume the response
      response.on('data', () => {});
      response.on('end', () => {
        console.log('Session established, cookies:', cookieString);
        resolve(cookieString);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Session timeout'));
    });
  });
}

async function downloadAndOrganizeData(): Promise<void> {
  try {
    console.log('Starting data download and organization...');
    
    // Use the working cookies from Postman
    const sessionCookies = '_abck=3B6F4DB38176A318835D5409FE27A32E~-1~YAAQ189YaKIqq5yZAQAA1P2QtQ6z0ltpYgJWh1WfBhUS2ySw2jtxoLCmIZicegftw8m0LMaQCA2k6C+Q9OUO/kOrRg/PVb0s7MrK5r3oNm3tG0RnqMcbAxrWjq3z0a2LlalkT8T55H4hUQEjl851TVR/khpPmaNrgrwiQ1fd9ugMKsy1MNl9i92K6OWQL4nAr3tjfEJoMKggJnI1P1bwDEe9BUmuP2Z8Gh9Gzse4ntT7+z4VkLQfNxkoiboyceOVqIJLNSDFCgdoEmFCQNhILn6s4ma7eeFSrjPpYhYwdtSUryCeHpRbo/CyvI8u+VsD1LSW7/WEAj1yf6eLJVSnDHpknCgt12U/MpvFtzQmrrGBRpsQFFZeVvKcuSdSSZ0r2I8=~-1~-1~-1~-1~-1; bm_sz=BA4970BD5923218C6002294244295691~YAAQ189YaKMqq5yZAQAA1f2QtR3q1jiFfoEQlC00/m2nt2AEHna1oTVZ7Mu+s4BjMiXS4Pcvto7oXJTXAchq8kj8+4I2xcntAux0M8CtCCFrFv+EReL0D9q+9W/GBUsYd6QaGPCiTPM45EQd4Q448J0IRHO/p5pHpmgM67WYiSNF5o8n8AYS8XDE+e59BF4DCLdra6iCJtHgp/XTOtdKX+YH1iIC/PV/o2RTz3HCtjwrwKXc4R4Tx4du+DyIo/2m5PQJT0jAxhNpxA9DLWMQt6jSp2o0ev4YtUFd5/Uzvs+O+Ce3FJJ1aWzoFdt/1ZcMWXFsabQsZazvAnN+RhD/OzUGpTkGdecgohY0~3359554~3290933';
    
    // Read spec.json
    const specPath = path.join(process.cwd(), 'data', 'spec.json');
    if (!fs.existsSync(specPath)) {
      throw new Error('spec.json not found in data directory');
    }
    
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const spec: SpecData = JSON.parse(specContent);
    
    console.log(`Found ${Object.keys(spec).length} states in spec.json`);
    
    // Process each state
    for (const [state, url] of Object.entries(spec)) {
      console.log(`\nProcessing ${state.toUpperCase()}...`);
      
      // Download zip file
      const zipPath = path.join(process.cwd(), 'data', `${state}_temp.zip`);
      console.log(`Downloading from ${url}...`);
      await downloadFile(url, zipPath, sessionCookies);
      console.log(`Downloaded zip for ${state.toUpperCase()}`);
      
      // Extract and organize CSV
      await extractZipAndMoveCSV(zipPath, state);
    }
    
    console.log('\nData download and organization completed successfully!');
  } catch (error) {
    console.error('Download and organization failed:', error);
    throw error;
  }
}

if (require.main === module) {
  downloadAndOrganizeData()
    .then(() => {
      console.log('Download completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Download failed:', error);
      process.exit(1);
    });
}

export { downloadAndOrganizeData };