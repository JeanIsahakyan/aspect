# @aspectly/core

## 2.2.0

### Patch Changes

- Fix handshake timeout on the later-initializing side. `handleInitResult` now
  marks the bridge as available: receiving an `InitResult` means the peer
  acknowledged our `Init`, so it is alive and ready. Previously, a side that
  missed the peer's `Init` (e.g. the host broadcast it before the mini-app
  subscribed) received only the `InitResult`, leaving `available` false and its
  `init()` promise unresolved until timeout. Note: `InitResult` carries no method
  list, so `supports()` may be incomplete for a side that only received an
  `InitResult`; `send()` gates on `isAvailable()` only, so calls still work.
- Updated dependencies [a7ba1c0]
  - @aspectly/transports@2.2.0
