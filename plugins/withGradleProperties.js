const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withCustomGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const keysToSet = [
      { key: 'org.gradle.jvmargs', value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError' },
      { key: 'org.gradle.warning.mode', value: 'none' },
      { key: 'android.useAndroidX', value: 'true' },
      { key: 'android.enableJetifier', value: 'true' },
    ];

    const keysToReplace = new Set(keysToSet.map(e => e.key));

    // Remove any existing entries for keys we are about to set
    const filtered = config.modResults.filter(
      p => !(p.type === 'property' && keysToReplace.has(p.key))
    );

    for (const entry of keysToSet) {
      filtered.push({ type: 'property', key: entry.key, value: entry.value });
    }

    config.modResults = filtered;
    return config;
  });
};
