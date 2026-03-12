#!/bin/bash

# GitHub Token (الخاص بك)
GITHUB_TOKEN="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"
REPO="sherifghazi2026-ops/Zid"

echo "🚀 بدء إضافة secrets إلى $REPO..."
echo "==================================="

# الحصول على public key للمستودع
PUBLIC_KEY_DATA=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$REPO/actions/secrets/public-key)

PUBLIC_KEY=$(echo "$PUBLIC_KEY_DATA" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
KEY_ID=$(echo "$PUBLIC_KEY_DATA" | grep -o '"key_id":"[^"]*"' | cut -d'"' -f4)

echo "🔑 تم الحصول على public key"

# دالة لتشفير وإضافة secret
add_secret() {
  local name=$1
  local value=$2
  
  echo "📦 إضافة: $name"
  
  # تشفير القيمة
  local encrypted=$(echo -n "$value" | openssl base64 -A)
  
  # إضافة secret
  curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/$REPO/actions/secrets/$name \
    -d "{\"encrypted_value\":\"$encrypted\",\"key_id\":\"$KEY_ID\"}" > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "✅ تم إضافة $name"
  else
    echo "❌ فشل إضافة $name"
  fi
  echo "---"
}

# قراءة ملف .env وإضافة كل متغير
while IFS='=' read -r key value || [ -n "$key" ]; do
  # تخطي الأسطر الفارغة والتعليقات
  if [[ -n "$key" && "$key" != \#* ]]; then
    # إزالة المسافات الزائدة
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # إزالة علامات الاقتباس إذا وجدت
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    # إضافة secret
    add_secret "$key" "$value"
  fi
done < .env

echo "🎉 تم إضافة جميع secrets بنجاح!"
echo "🚀 اذهب إلى GitHub Actions وأعد تشغيل الـ workflow"
