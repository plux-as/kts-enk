const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withFollyCoroutineFix(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (buildConfig.buildSettings) {
        const existing = buildConfig.buildSettings['GCC_PREPROCESSOR_DEFINITIONS'];
        if (Array.isArray(existing)) {
          if (!existing.includes('FOLLY_CFG_NO_COROUTINES=1')) {
            existing.push('FOLLY_CFG_NO_COROUTINES=1');
          }
        } else if (typeof existing === 'string') {
          if (!existing.includes('FOLLY_CFG_NO_COROUTINES=1')) {
            buildConfig.buildSettings['GCC_PREPROCESSOR_DEFINITIONS'] = [existing, 'FOLLY_CFG_NO_COROUTINES=1'];
          }
        } else {
          buildConfig.buildSettings['GCC_PREPROCESSOR_DEFINITIONS'] = ['$(inherited)', 'FOLLY_CFG_NO_COROUTINES=1'];
        }
      }
    }
    return config;
  });
};
