# @aspectly/react-native

## 2.2.0

### Patch Changes

- Fix the bridge handshake (and all injected events) failing on iOS WKWebView.

  - The host now dispatches a plain `Event('message')` with `data` assigned as an
    own property instead of `new MessageEvent('message', { data })`. On iOS
    WKWebView the `MessageEvent` init dictionary is dropped in this injection
    path, so the client's listener fired with an empty `e.data` and the handshake
    never parsed. A `MessageEvent` fallback is kept for other engines.
  - The event payload is serialized with `JSON.stringify`, producing a properly
    escaped JS string literal so quotes, backslashes and newlines in the payload
    can no longer break the injected script (previously it was interpolated inside
    single quotes).
  - The injected script ends with `true;`. On iOS `react-native-webview`
    serializes the result of the evaluated script, and an IIFE returning
    `undefined` crashes WKWebView.
  - @aspectly/core@2.2.0
