#!/bin/bash
# Script để test build giống Vercel
# Sử dụng: ./scripts/test-build-vercel.sh

set -e  # Exit on error

echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "📦 Installing dependencies (fresh install)..."
rm -rf node_modules
npm ci

echo "🔧 Generating Prisma Client..."
npm run prisma:generate

echo "🔍 Running TypeScript check..."
npm run check:types

echo "🏗️  Building Next.js (same as Vercel)..."
NODE_ENV=production npm run build:next

echo "✅ Build successful! This should work on Vercel too."

