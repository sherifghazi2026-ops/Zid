module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // ❌ تم إزالة react-native-reanimated/plugin
  };
};
