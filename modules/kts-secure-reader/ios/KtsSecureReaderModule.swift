import ExpoModulesCore
import Foundation

public class KtsSecureReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KtsSecureReaderModule")

    AsyncFunction("readSecurityScopedFile") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri) else {
        promise.reject("INVALID_URI", "Could not parse URI: \(uri)")
        return
      }

      let didStart = url.startAccessingSecurityScopedResource()

      defer {
        if didStart {
          url.stopAccessingSecurityScopedResource()
        }
      }

      var coordinatorError: NSError?
      var fileContents: String?
      var readError: Error?

      let coordinator = NSFileCoordinator()
      coordinator.coordinate(readingItemAt: url, options: .withoutChanges, error: &coordinatorError) { coordURL in
        do {
          fileContents = try String(contentsOf: coordURL, encoding: .utf8)
        } catch {
          readError = error
        }
      }

      if let error = coordinatorError {
        promise.reject("COORDINATOR_ERROR", error.localizedDescription)
      } else if let error = readError {
        promise.reject("READ_ERROR", error.localizedDescription)
      } else if let contents = fileContents {
        promise.resolve(contents)
      } else {
        promise.reject("UNKNOWN_ERROR", "File read returned no content and no error")
      }
    }
  }
}
