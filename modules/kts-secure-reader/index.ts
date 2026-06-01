import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface KtsSecureReaderModuleType {
  readSecurityScopedFile(uri: string): Promise<string>;
  getPendingImportPath(): Promise<string | null>;
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
 * Returns the tmp file path written by KtsFileHandlerSubscriber at app launch,
 * or null if no pending import exists. Clears the stored path after reading.
 * Call this FIRST on cold launch — if non-null, read from this path instead of
 * the original security-scoped URI.
 */
export async function getPendingImportPath(): Promise<string | null> {
  if (!nativeModule) return null;
  return nativeModule.getPendingImportPath();
}

export async function readSecurityScopedFile(uri: string): Promise<string> {
  if (!nativeModule) {
    throw new Error(
      'native module unavailable — ' + (loadError ?? 'unknown reason') +
      ' (check .gitignore and pod install logs)'
    );
  }
  return nativeModule.readSecurityScopedFile(uri);
}

export const isAvailable = (): boolean => true;
export const getNativeLoadError = (): string | null => loadError;
