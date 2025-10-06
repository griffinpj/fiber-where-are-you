interface Config {
  database: {
    url: string;
  };
  api: {
    geocodingKey?: string;
  };
  app: {
    url: string;
    secret: string;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getOptionalEnvVar(name: string): string | undefined {
  return process.env[name];
}

export const config: Config = {
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  api: {
    geocodingKey: getOptionalEnvVar('GEOCODING_API_KEY'),
  },
  app: {
    url: getEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),
    secret: getEnvVar('NEXTAUTH_SECRET'),
  },
};

export default config;