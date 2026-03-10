#!/bin/bash
# Script لإضافة كل secrets دفعة واحدة

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🚀 بدء إضافة secrets إلى GitHub..."

while IFS='=' read -r key value
do
  if [[ ! -z "$key" && ! "$key" == \#* ]]; then
    echo "➕ إضافة $key..."
    if gh secret set "$key" -b "$value"; then
      echo -e "${GREEN}✅ تمت إضافة $key بنجاح${NC}"
    else
      echo -e "${RED}❌ فشل في إضافة $key${NC}"
    fi
  fi
done < .env

echo -e "${GREEN}✅ تم الانتهاء من إضافة جميع secrets!${NC}"
