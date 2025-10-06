#!/bin/sh
set -e

echo "🚀 Starting Fiber Where Are You application..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Running database migrations..."
npx prisma migrate deploy

# Check if we should seed the database
if [ "$RUN_SEED" = "true" ]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
else
    echo "⏭️  Skipping database seeding (set RUN_SEED=true to enable)"
fi

echo "✅ Database setup complete. Starting application..."
exec node server.js