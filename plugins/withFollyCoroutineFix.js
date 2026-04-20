const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'FOLLY_HAS_COROUTINES=0';

const PATCH_LINES = `
  # Fix: 'folly/coro/Coroutine.h' file not found
  # FOLLY_HAS_COROUTINES=1 is set but the coroutine header is missing from the Xcode SDK.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_HAS_COROUTINES=0'
    end
  end`;

/**
 * Config plugin that patches the Podfile to disable Folly coroutines,
 * fixing the "'folly/coro/Coroutine.h' file not found" iOS build error.
 *
 * Strategy:
 *   - If a post_install block already exists, append our snippet inside it.
 *   - Otherwise, append a new post_install block at the end of the file.
 * The patch is guarded by PATCH_MARKER so it is only added once.
 */
function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // Idempotency guard — never add the patch twice.
      if (contents.includes(PATCH_MARKER)) {
        return config;
      }

      if (contents.includes('post_install do |installer|')) {
        // Inject our lines just before the closing `end` of the existing
        // post_install block.  The regex matches the block non-greedily so it
        // targets the *first* post_install block rather than the last `end` in
        // the whole file.
        contents = contents.replace(
          /(post_install do \|installer\|)([\s\S]*?)(\n\s*end)/,
          (_match, open, inner, close) =>
            `${open}${inner}\n${PATCH_LINES}${close}`
        );
      } else {
        // No post_install block exists — append one at the end of the file.
        contents =
          contents.trimEnd() +
          `\n\npost_install do |installer|\n${PATCH_LINES}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents, 'utf8');
      return config;
    },
  ]);
}

module.exports = withFollyCoroutineFix;
