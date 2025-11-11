#!/bin/bash

echo "🔐 Security Configuration Validator"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

echo "Checking .env configuration..."
echo ""

# Source .env
export $(grep -v '^#' .env | xargs)

# 1. Check JWT_SECRET
echo -n "1. JWT_SECRET: "
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ Missing${NC}"
    ((ERRORS++))
elif [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${YELLOW}⚠️  Too short (${#JWT_SECRET} chars, recommend 64+)${NC}"
    ((WARNINGS++))
elif [[ "$JWT_SECRET" == *"change_this"* ]] || [[ "$JWT_SECRET" == *"your_"* ]]; then
    echo -e "${RED}❌ Using default/template value${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Strong (${#JWT_SECRET} chars)${NC}"
fi

# 2. Check JWT_REFRESH_SECRET
echo -n "2. JWT_REFRESH_SECRET: "
if [ -z "$JWT_REFRESH_SECRET" ]; then
    echo -e "${RED}❌ Missing${NC}"
    ((ERRORS++))
elif [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
    echo -e "${YELLOW}⚠️  Too short (${#JWT_REFRESH_SECRET} chars, recommend 64+)${NC}"
    ((WARNINGS++))
elif [[ "$JWT_REFRESH_SECRET" == *"change_this"* ]] || [[ "$JWT_REFRESH_SECRET" == *"your_"* ]]; then
    echo -e "${RED}❌ Using default/template value${NC}"
    ((ERRORS++))
elif [ "$JWT_SECRET" == "$JWT_REFRESH_SECRET" ]; then
    echo -e "${RED}❌ Same as JWT_SECRET (must be different)${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Strong (${#JWT_REFRESH_SECRET} chars)${NC}"
fi

# 3. Check DB_PASSWORD
echo -n "3. DB_PASSWORD: "
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Missing${NC}"
    ((ERRORS++))
elif [ ${#DB_PASSWORD} -lt 16 ]; then
    echo -e "${YELLOW}⚠️  Too short (${#DB_PASSWORD} chars, recommend 16+)${NC}"
    ((WARNINGS++))
elif [[ "$DB_PASSWORD" == *"change"* ]] || [[ "$DB_PASSWORD" == *"password"* ]] || [[ "$DB_PASSWORD" == "barbershop123" ]]; then
    echo -e "${RED}❌ Using weak/default password${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Strong (${#DB_PASSWORD} chars)${NC}"
fi

# 4. Check ADMIN_PASSWORD
echo -n "4. ADMIN_PASSWORD: "
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ Missing${NC}"
    ((ERRORS++))
elif [ ${#ADMIN_PASSWORD} -lt 12 ]; then
    echo -e "${YELLOW}⚠️  Too short (${#ADMIN_PASSWORD} chars, recommend 12+)${NC}"
    ((WARNINGS++))
elif [[ "$ADMIN_PASSWORD" == "Admin@123456" ]] || [[ "$ADMIN_PASSWORD" == *"ChangeThis"* ]]; then
    echo -e "${RED}❌ Using default password${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Strong (${#ADMIN_PASSWORD} chars)${NC}"
fi

# 5. Check ADMIN_EMAIL
echo -n "5. ADMIN_EMAIL: "
if [ -z "$ADMIN_EMAIL" ]; then
    echo -e "${RED}❌ Missing${NC}"
    ((ERRORS++))
elif [[ "$ADMIN_EMAIL" == "admin@barbershop.com" ]]; then
    echo -e "${YELLOW}⚠️  Using default email (change to your actual email)${NC}"
    ((WARNINGS++))
elif [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}❌ Invalid email format${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Valid${NC}"
fi

# 6. Check EMAIL_USER
echo -n "6. EMAIL_USER: "
if [ -z "$EMAIL_USER" ]; then
    echo -e "${YELLOW}⚠️  Not configured (required for production)${NC}"
    ((WARNINGS++))
elif [[ "$EMAIL_USER" == "your_email@gmail.com" ]]; then
    echo -e "${YELLOW}⚠️  Using template value${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Configured${NC}"
fi

# 7. Check EMAIL_PASSWORD
echo -n "7. EMAIL_PASSWORD: "
if [ -z "$EMAIL_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Not configured (required for production)${NC}"
    ((WARNINGS++))
elif [[ "$EMAIL_PASSWORD" == "your_app_specific_password" ]]; then
    echo -e "${YELLOW}⚠️  Using template value${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Configured${NC}"
fi

# 8. Check .gitignore
echo -n "8. .gitignore protection: "
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env is ignored${NC}"
else
    echo -e "${RED}❌ .env is NOT in .gitignore${NC}"
    ((ERRORS++))
fi

# 9. Check if .env is tracked by git
echo -n "9. Git tracking: "
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo -e "${RED}❌ .env is tracked by Git (DANGEROUS!)${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ .env is not tracked${NC}"
fi

echo ""
echo "===================================="
echo "Summary:"
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Fix errors before deploying to production!${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Address warnings for production readiness${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Security configuration looks good!${NC}"
    exit 0
fi
