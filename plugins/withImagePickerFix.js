const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withImagePickerFix(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    const activities = application.activity || [];
    application.activity = activities.map((activity) => {
      const name = activity.$?.['android:name'];
      if (name === 'expo.modules.imagepicker.ExpoCropImageActivity') {
        // Remove the tools:node="replace" attribute that causes the merger conflict
        if (activity.$) {
          delete activity.$['tools:node'];
        }
      }
      return activity;
    });

    return config;
  });
};
