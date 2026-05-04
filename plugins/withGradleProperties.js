const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withCustomGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Remove existing org.gradle.jvmargs if present
    const filtered = props.filter(p => !(p.type === 'property' && p.key === 'org.gradle.jvmargs'));

    filtered.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError',
    });

    config.modResults = filtered;
    return config;
  });
};
