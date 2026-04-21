const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withFollyCoroutineFix(config) {
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      // --- Patch 1: FOLLY_CFG_NO_COROUTINES=1 in post_install ---
      const follyPatch = `
  # Fix for folly/coro/Coroutine.h not found on iOS 26 SDK
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('FOLLY_CFG_NO_COROUTINES=1')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      end
    end
  end`;

      if (!contents.includes('FOLLY_CFG_NO_COROUTINES')) {
        if (contents.includes('post_install do |installer|')) {
          contents = contents.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|\n${follyPatch}`
          );
        } else {
          contents += `\npost_install do |installer|\n${follyPatch}\nend\n`;
        }
      }

      // --- Patch 2: Fix ReanimatedMountHook.h override error via pre_install Ruby patch ---
      // __dir__ in a Podfile refers to the ios/ directory, so '../node_modules/...' correctly
      // resolves to the project root's node_modules. A second path via installer.sandbox.root
      // is provided as a fallback in case __dir__ behaves unexpectedly in the CocoaPods context.
      const reanimatedPatch = `
# Fix react-native-reanimated 'override' error on Xcode 26
pre_install do |installer|
  possible_paths = [
    File.join(__dir__, '..', 'node_modules', 'react-native-reanimated', 'Common', 'cpp', 'reanimated', 'Fabric', 'ReanimatedMountHook.h'),
    File.join(File.dirname(installer.sandbox.root), 'node_modules', 'react-native-reanimated', 'Common', 'cpp', 'reanimated', 'Fabric', 'ReanimatedMountHook.h'),
  ]
  header_path = possible_paths.find { |p| File.exist?(p) }
  if header_path
    content = File.read(header_path)
    if content.include?('double mountTime) noexcept override;')
      patched = content.gsub('double mountTime) noexcept override;', 'double mountTime) noexcept;')
      File.write(header_path, patched)
      puts '[withFollyCoroutineFix] Patched ReanimatedMountHook.h at: ' + header_path
    else
      puts '[withFollyCoroutineFix] ReanimatedMountHook.h already patched or pattern not found'
    end
  else
    puts '[withFollyCoroutineFix] ReanimatedMountHook.h not found in any expected location'
    possible_paths.each { |p| puts '  tried: ' + p }
  end
end
`;

      if (!contents.includes('ReanimatedMountHook')) {
        contents += reanimatedPatch;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);

  return config;
}

module.exports = withFollyCoroutineFix;
