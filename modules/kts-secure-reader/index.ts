import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface KtsSecureReaderModuleType {
  readSecurityScopedFile(uri: string): Promise<string>;
}

let nativeModule: KtsSecureReaderModuleType | null = null;
if (Platform.OS === 'ios') {
  try {
    nativeModule = requireNativeModule<KtsSecureReaderModuleType>('KtsSecureReaderModule');
  } catch (e) {
    console.warn('[KtsSecureReader] Native module not available:', e);
  }
}

/**
 * Reads a (possibly security-scoped) file URI on iOS using the documented Apple
 * `startAccessingSecurityScopedResource` handshake. Returns the file contents as
 * a UTF-8 string.
 *
 * On non-iOS platforms or when the module is missing, throws — callers should
 * catch and fall back to JavaScript file-reading strategies.
 */
export async function readSecurityScopedFile(uri: string): Promise<string> {
  if (!nativeModule) {
    throw new Error('KtsSecureReader native module is not available on this platform');
  }
  return nativeModule.readSecurityScopedFile(uri);
}

export const isAvailable = (): boolean => nativeModule !== null;
