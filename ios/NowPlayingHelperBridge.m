#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NowPlayingHelper, NSObject)

RCT_EXTERN_METHOD(forcePlaybackRate:(double)rate)

@end
