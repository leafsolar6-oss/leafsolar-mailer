#!/bin/bash
# Leaf Solar Mailer - Build and Deploy Helper
set -e

echo "☀️  Leaf Solar Mailer - Build Script"
echo "===================================="

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "To run locally: npm start"
echo "To deploy to Vercel: npx vercel --prod"
echo ""
echo "To create APK:"
echo "  1. Deploy with HTTPS"
echo "  2. Visit https://www.pwabuilder.com"
echo "  3. Enter your URL and download the Android package"
echo ""
