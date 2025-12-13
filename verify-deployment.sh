#!/bin/bash

# Deployment Verification Script
# This script helps verify that the quotation assignment fix is deployed correctly

echo "🔍 Deployment Verification Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Backend URL is required${NC}"
    echo "Usage: ./verify-deployment.sh <BACKEND_URL>"
    echo "Example: ./verify-deployment.sh https://your-backend.railway.app"
    exit 1
fi

BACKEND_URL=$1
API_URL="${BACKEND_URL}/api"

echo "📡 Testing Backend: ${BACKEND_URL}"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "quotationAssignment"; then
    echo -e "${GREEN}✅ Health check passed - Quotation assignment feature detected${NC}"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Health check response doesn't show quotation assignment feature${NC}"
    echo "$HEALTH_RESPONSE"
fi
echo ""

# Test 2: Check API Base URL
echo "2️⃣ Verifying API endpoints..."
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/sales/test-routes")
if [ "$API_TEST" = "200" ]; then
    echo -e "${GREEN}✅ API endpoints are accessible${NC}"
else
    echo -e "${RED}❌ API endpoints returned status: ${API_TEST}${NC}"
fi
echo ""

# Test 3: Check Environment
echo "3️⃣ Checking environment..."
echo "Backend URL: ${BACKEND_URL}"
echo "API URL: ${API_URL}"
echo ""

# Test 4: Instructions
echo "📋 Next Steps:"
echo "1. Verify frontend VITE_API_URL is set to: ${API_URL}"
echo "2. Clear Netlify cache and redeploy frontend"
echo "3. Test quotation assignment in production"
echo "4. Check browser console for debug logs"
echo "5. Check backend logs for assignment verification"
echo ""

echo -e "${GREEN}✅ Verification complete!${NC}"

