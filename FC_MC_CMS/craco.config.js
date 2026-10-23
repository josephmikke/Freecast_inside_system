const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@entities': path.resolve(__dirname, 'src/domain/entities'),
    },
    configure: (webpackConfig) => {
      // Ignore source map warnings for shaka-player
      webpackConfig.ignoreWarnings = [
        {
          module: /shaka-player/,
        },
      ];
      return webpackConfig;
    },
  },
};
