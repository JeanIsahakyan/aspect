# @aspectly/transports

## 2.2.0

### Minor Changes

- a7ba1c0: Add native mobile/desktop transports for the new Swift and Kotlin bridges:

  - `WebKitTransport` (`@aspectly/transports/webkit`) — detects a native WKWebView
    host on iOS/macOS via `window.webkit.messageHandlers.aspectly`.
  - `AndroidTransport` (`@aspectly/transports/android`) — detects a native Android
    WebView host via `window.AspectlyAndroid`.
  - `FlutterTransport` (`@aspectly/transports/flutter`) — detects a native Flutter
    host via `window.AspectlyFlutter`.

  Both are registered in the auto-detection registry (priorities: WebKit 95,
  Android 85), so `@aspectly/core` running in a native WebView is detected
  automatically. Companion native libraries: `AspectlyBridge` (Swift, iOS/macOS)
  and `aspectly-bridge` (Kotlin, Android).
