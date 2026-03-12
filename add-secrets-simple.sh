#!/bin/bash

# GitHub Token
GITHUB_TOKEN="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"
REPO="sherifghazi2026-ops/Zid"

echo "🚀 بدء إضافة secrets إلى $REPO..."
echo "==================================="

# قراءة ملف .env وإضافة كل متغير كـ secret
while IFS='=' read -r key value || [ -n "$key" ]; do
  # تخطي الأسطر الفارغة والتعليقات
  if [[ -n "$key" && "$key" != \#* ]]; then
    # تنظيف القيمة
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    echo "📦 إضافة: $key"
    
    # استخدام base64 الموجود في Termux
    encoded=$(echo -n "$value" | base64 -w 0)
    
    # الحصول على public key
    pubkey_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      https://api.github.com/repos/$REPO/actions/secrets/public-key)
    
    pubkey=$(echo "$pubkey_response" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
    key_id=$(echo "$pubkey_response" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$pubkey" ]; then
      echo "❌ فشل الحصول على public key"
      continue
    fi
    
    # إضافة secret
    response=$(curl -s -X PUT \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/repos/$REPO/actions/secrets/$key \
      -d "{\"encrypted_value\":\"$encoded\",\"key_id\":\"$key_id\"}")
    
    if echo "$response" | grep -q "created"; then
      echo "✅ تم إضافة $key"
    else
      echo "⚠️  $key قد يكون موجوداً مسبقاً"
    fi
    echo "---"
  fi
done < .env

echo "🎉 انتهى!"
