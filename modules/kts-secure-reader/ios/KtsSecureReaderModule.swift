import ExpoModulesCore
import Foundation

// ─── AppDelegate subscriber ───────────────────────────────────────────────────
// Fires in the native AppDelegate BEFORE JS starts, while the security scope
// is still valid. Copies the file to tmp and stores the path in UserDefaults.
public class KtsFileHandlerSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    guard url.pathExtension.lowercased() == "kts" else { return false }

    let didStart = url.startAccessingSecurityScopedResource()
    defer { if didStart { url.stopAccessingSecurityScopedResource() } }

    do {
      let data = try Data(contentsOf: url)
      let tmpURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("kts-incoming-\(Date().timeIntervalSince1970).kts")
      try data.write(to: tmpURL)
      UserDefaults.standard.set(tmpURL.path, forKey: "pendingKtsImportPath")
      UserDefaults.standard.synchronize()
    } catch {
      // Copy failed — JS will fall back to reading the original URI directly
    }

    return false // let expo-linking also process the URL for deep-link routing
  }
}

// ─── Native module ────────────────────────────────────────────────────────────
public class KtsSecureReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KtsSecureReaderModule")

    // Returns the tmp path written by KtsFileHandlerSubscriber, then clears it.
    // JS calls this first on cold launch — if non-nil, read from this path instead
    // of the original security-scoped URI.
    AsyncFunction("getPendingImportPath") { (promise: Promise) in
      let path = UserDefaults.standard.string(forKey: "pendingKtsImportPath")
      UserDefaults.standard.removeObject(forKey: "pendingKtsImportPath")
      UserDefaults.standard.synchronize()
      promise.resolve(path)
    }

    // Fallback: attempt to read a security-scoped URI directly from JS.
    // Tries three paths and reports scope-grant status in the error if all fail.
    AsyncFunction("readSecurityScopedFile") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri) else {
        promise.reject("INVALID_URI", "Could not parse URI: \(uri)")
        return
      }

      let didStart = url.startAccessingSecurityScopedResource()
      defer { if didStart { url.stopAccessingSecurityScopedResource() } }
      let scopeStatus = didStart ? "scope-granted" : "scope-denied"

      // Path 1: NSFileCoordinator
      var coordinatorError: NSError?
      var fileContents: String?
      var path1Error: String?
      let coordinator = NSFileCoordinator()
      coordinator.coordinate(readingItemAt: url, options: .withoutChanges, error: &coordinatorError) { coordURL in
        do {
          fileContents = try String(contentsOf: coordURL, encoding: .utf8)
        } catch {
          path1Error = "coordinator: \(error.localizedDescription)"
        }
      }
      if let contents = fileContents {
        promise.resolve(contents)
        return
      }

      // Path 2: Direct Data read
      do {
        let data = try Data(contentsOf: url)
        if let str = String(data: data, encoding: .utf8) {
          promise.resolve(str)
          return
        }
        promise.reject("DECODE_ERROR", "[\(scopeStatus)] UTF-8 decode failed after direct read")
        return
      } catch {
        let path2Error = "direct: \(error.localizedDescription)"

        // Path 3: Copy to tmp then read
        let tmpURL = FileManager.default.temporaryDirectory
          .appendingPathComponent("kts-scoped-\(Date().timeIntervalSince1970).kts")
        do {
          try FileManager.default.copyItem(at: url, to: tmpURL)
          let str = try String(contentsOf: tmpURL, encoding: .utf8)
          try? FileManager.default.removeItem(at: tmpURL)
          promise.resolve(str)
        } catch {
          let path3Error = "copy-tmp: \(error.localizedDescription)"
          promise.reject(
            "ALL_PATHS_FAILED",
            "[\(scopeStatus)] path1=\(path1Error ?? coordinatorError?.localizedDescription ?? "nil") | path2=\(path2Error) | path3=\(path3Error)"
          )
        }
      }
    }
  }
}
