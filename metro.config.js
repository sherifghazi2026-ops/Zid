const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// استبعاد مجلدات الـ node_modules العميقة والـ git لتوفير الـ Watchers
config.resolver.blacklistRE = /node_modules\/.*\/node_modules\/.*/;

module.exports = config;
