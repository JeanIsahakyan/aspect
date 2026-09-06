# @aspectly/react-native

## 2.2.0

### Patch Changes

- Fix iOS WKWebView crash when the native host injects bridge events (including the
  `Init` handshake) into the WebView.

  - The injected script now ends with `true;`. On iOS `react-native-webview`
    serializes the result of the evaluated script, and the previous IIFE returned
    `undefined`, which crashes WKWebView.
  - The event payload is now serialized with `JSON.stringify`, producing a
    properly escaped JS string literal so quotes, backslashes and newlines in the
    payload can no longer break the injected script (previously it was interpolated
    inside single quotes). The runtime value delivered to the WebView is unchanged,
    so the receiving side is unaffected.
  - @aspectly/core@2.2.0
