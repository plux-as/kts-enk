#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '../node_modules/react-native-reanimated/Common/cpp/reanimated/Fabric/ReanimatedMountHook.h'
);

if (!fs.existsSync(filePath)) {
  console.log('[patch-reanimated] File not found, skipping:', filePath);
  process.exit(0);
}

const original = fs.readFileSync(filePath, 'utf8');
const patched = original.replace(
  /(\s+double mountTime\) noexcept) override;/g,
  '$1;'
);

if (original === patched) {
  console.log('[patch-reanimated] Already patched or pattern not found, no changes made.');
} else {
  fs.writeFileSync(filePath, patched);
  console.log('[patch-reanimated] Successfully removed `override` from ReanimatedMountHook.h');
}
