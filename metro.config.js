const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// إضافة امتدادات الصور والخطوط
config.resolver.assetExts.push(
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'ttf', 'otf'
);

module.exports = config;
