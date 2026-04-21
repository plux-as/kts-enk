const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withFollyCoroutineFix(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (buildConfig && buildConfig.buildSettings) {
        const settings = buildConfig.buildSettings;
        const existing = settings['GCC_PREPROCESSOR_DEFINITIONS'];
        const newValue = '"FOLLY_CFG_NO_COROUTINES=1"';
        if (Array.isArray(existing)) {
          if (!existing.includes(newValue)) {
            existing.push(newValue);
          }
        } else if (typeof existing === 'string') {
          if (!existing.includes('FOLLY_CFG_NO_COROUTINES')) {
            settings['GCC_PREPROCESSOR_DEFINITIONS'] = [existing, newValue];
          }
        } else {
          settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['"$(inherited)"', newValue];
        }
      }
    }
    return config;
  });
};
