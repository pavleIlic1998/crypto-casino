#!/bin/bash

echo "========================================"
echo "Crypto Casino Complete Setup Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking environment variables...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    grep -q "VITE_SUPABASE_URL" .env && echo -e "${GREEN}✓ VITE_SUPABASE_URL found${NC}"
    grep -q "VITE_SUPABASE_ANON_KEY" .env && echo -e "${GREEN}✓ VITE_SUPABASE_ANON_KEY found${NC}"
else
    echo -e "${RED}✗ .env file not found!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Building project...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Project built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}Frontend Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Next steps (Manual - when Supabase region is available):"
echo ""
echo "1. Apply Database Schema:"
echo "   - Open Supabase Dashboard"
echo "   - Go to SQL Editor"
echo "   - Run the contents of: setup-database.sql"
echo ""
echo "2. Deploy Edge Functions:"
echo "   - Deploy: supabase/functions/init-seeds"
echo "   - Deploy: supabase/functions/play-slots"
echo "   - Deploy: supabase/functions/play-crash"
echo "   - Deploy: supabase/functions/play-roulette"
echo ""
echo "3. Test Application:"
echo "   - Register a new user"
echo "   - Login and play games"
echo "   - Verify balance updates"
echo ""
echo "For detailed instructions, see: SETUP_INSTRUCTIONS.md"
echo ""
