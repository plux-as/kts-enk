import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface KtsSecureReaderModuleType {
  readSecurityScopedFile(uri: string): Promise<string>;
}

let nativeModule: KtsSecureReaderModuleType | null = null;
let loadError: string | null = null;

if (Platform.OS === 'ios') {
  try {
    nativeModule = requireNativeModule<KtsSecureReaderModuleType>('KtsSecureReaderModule');
  } catch (e) {
    loadError = String(e);
    console.warn('[KtsSecureReader] Native module not available:', e);
  }
} else {
  loadError = 'not iOS (Platform.OS=' + Platform.OS + ')';
}

/**
 * Reads a (possibly security-scoped) file URI on iOS using the documented
 * Apple `startAccessingSecurityScopedResource` handshake. Returns the file
 * contents as a UTF-8 string. Throws a descriptive Error if the native
 * module isn't available — callers MUST catch this and add it to their
 * diagnostic chain rather than silently ignoring it.
 */
export async function readSecurityScopedFile(uri: string): Promise<string> {
  if (!nativeModule) {
    throw new Error(
      'native module unavailable — ' + (loadError ?? 'unknown reason') +
      ' (this means the iOS build did not include modules/kts-secure-reader/ios/*; check .gitignore and pod install logs)'
    );
  }
  return nativeModule.readSecurityScopedFile(uri);
}

/**
 * Always returns true — callers should ALWAYS attempt Strategy 0 and let it
 * throw if the native module is missing. Returning false would cause the
 * import flow to silently skip Strategy 0, which is exactly the bug that
 * shipped 8 times. The function is kept for source-compat but its semantic
 * is now "this strategy is reachable" rather than "the native module is
 * loaded". If you need to know whether the module loaded, call
 * `getNativeLoadError()`.
 */
export const isAvailable = (): boolean => true;

export const getNativeLoadError = (): string | null => loadError;
