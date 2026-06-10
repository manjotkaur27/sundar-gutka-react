import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
// Background download support (@kesha-antonov/react-native-background-downloader).
// If this import fails to resolve after `pod install`, expose the header via a
// bridging header instead: #import <RNBackgroundDownloader/RNBackgroundDownloader.h>
import RNBackgroundDownloader
 
@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "RnDiffApp"
    self.dependencyProvider = RCTAppDependencyProvider()
 
    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]
 
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
 
  // Reconnect the background URLSession so downloads that completed while the
  // app was suspended/terminated can finish flushing to disk on next launch.
  func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    RNBackgroundDownloader.setCompletionHandlerWithIdentifier(identifier, completionHandler: completionHandler)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }
 
  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}