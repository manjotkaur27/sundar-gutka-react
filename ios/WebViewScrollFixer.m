#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

/// Native module that disables the iOS "tap status bar to scroll to top" gesture
/// on ALL WKWebViews currently in the view hierarchy.
///
/// On iPad, the touch target for this system gesture extends well into the
/// app header area, causing the WebView to jump to position 0 whenever
/// the user taps the back arrow, title, or bookmark icon.
///
/// This implementation does NOT rely on the RCT bridge or UIManager, so it
/// works correctly in both bridged and bridgeless (new architecture) modes.
///
/// Usage from JS:
///   import { NativeModules } from 'react-native';
///   NativeModules.WebViewScrollFixer.disableScrollsToTop();
@interface WebViewScrollFixer : NSObject <RCTBridgeModule>
@end

@implementation WebViewScrollFixer

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

/// Recursively searches for all WKWebViews inside a given UIView hierarchy
/// and disables scrollsToTop on each one.
- (void)disableScrollsToTopInView:(UIView *)view {
  if ([view isKindOfClass:[WKWebView class]]) {
    ((WKWebView *)view).scrollView.scrollsToTop = NO;
    return; // WKWebView's subviews don't contain another WKWebView
  }
  for (UIView *subview in view.subviews) {
    [self disableScrollsToTopInView:subview];
  }
}

/// Disables scrollsToTop on all WKWebViews in the app.
/// Called from JS after the WebView finishes loading.
RCT_EXPORT_METHOD(disableScrollsToTop) {
  dispatch_async(dispatch_get_main_queue(), ^{
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
      if (![scene isKindOfClass:[UIWindowScene class]]) continue;
      for (UIWindow *window in ((UIWindowScene *)scene).windows) {
        [self disableScrollsToTopInView:window];
      }
    }
  });
}

@end
