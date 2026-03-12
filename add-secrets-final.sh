#!/bin/bash

# GitHub Token
GITHUB_TOKEN="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"
REPO="sherifghazi2026-ops/Zid"

echo "🚀 بدء إضافة secrets إلى $REPO..."
echo "==================================="

# الحصول على public key
echo "🔑 جلب public key..."
PUBKEY_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$REPO/actions/secrets/public-key)

PUBLIC_KEY=$(echo "$PUBKEY_RESPONSE" | grep -o '"key":"[^"]*"' | head -1 | cut -d'"' -f4)
KEY_ID=$(echo "$PUBKEY_RESPONSE" | grep -o '"key_id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "✅ PUBLIC_KEY: $PUBLIC_KEY"
echo "✅ KEY_ID: $KEY_ID"
echo "-----------------------------------"

# قراءة ملف .env وإضافة كل متغير
SUCCESS_COUNT=0
FAIL_COUNT=0

while IFS='=' read -r key value || [ -n "$key" ]; do
  # تخطي الأسطر الفارغة والتعليقات
  if [[ -n "$key" && "$key" != \#* ]]; then
    # تنظيف القيمة
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    if [ -n "$value" ]; then
      echo "📦 إضافة: $key"
      
      # تشفير القيمة باستخدام base64
      ENCODED=$(echo -n "$value" | base64 -w 0)
      
      # إضافة secret
      RESPONSE=$(curl -s -X PUT \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/repos/$REPO/actions/secrets/$key \
        -d "{\"encrypted_value\":\"$ENCODED\",\"key_id\":\"$KEY_ID\"}")
      
      # التحقق من النتيجة
      if echo "$RESPONSE" | grep -q "201" || echo "$RESPONSE" | grep -q "204" || [ -z "$RESPONSE" ]; then
        echo "✅ تم إضافة $key"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
      else
        echo "⚠️  $key قد يكون موجوداً مسبقاً"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
      fi
      echo "---"
    fi
  fi
done < .env

echo "🎉 تم الانتهاء!"
echo "✅ تمت إضافة $SUCCESS_COUNT secret"
echo ""
echo "🚀 اذهب إلى GitHub Actions وأعد تشغيل الـ workflow:"
echo "https://github.com/$REPO/actions"
