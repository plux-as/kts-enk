const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

module.exports = function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfilePath, 'utf8');

      const postInstallHook = `
  # Fix for folly/coro/Coroutine.h not found with react-native-reanimated on iOS 26 SDK
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      end
    end
  end

  # Fix reanimated override warning treated as error on newer Xcode
  # (non-virtual member function marked 'override' hides virtual member function in ReanimatedMountHook.h)
  installer.pods_project.targets.each do |target|
    if target.name == 'RNReanimated'
      target.build_configurations.each do |config|
        config.build_settings['WARNING_CFLAGS'] ||= ['$(inherited)']
        config.build_settings['WARNING_CFLAGS'] << '-Wno-inconsistent-missing-override'
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] ||= ['$(inherited)']
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] << '-Wno-inconsistent-missing-override'
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        config.build_settings['CLANG_WARN_OBJCPP_ARC_EXCEPTIONS'] = 'NO'
      end
    end
  end`;

      let newContents;
      if (contents.includes('post_install do |installer|')) {
        // Insert inside existing post_install block
        newContents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${postInstallHook}`
        );
      } else {
        // Append a new post_install block
        newContents = contents + `\npost_install do |installer|\n${postInstallHook}\nend\n`;
      }

      fs.writeFileSync(podfilePath, newContents);
      return config;
    },
  ]);
};
