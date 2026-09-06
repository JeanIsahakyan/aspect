import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render } from '@testing-library/react';
import React from 'react';
import { useAspectlyWebView } from './useAspectlyWebView';

// Mock @aspectly/core
vi.mock('@aspectly/core', () => ({
  BridgeCore: {
    wrapBridgeEvent: vi.fn((event) => JSON.stringify({ type: 'BridgeEvent', event })),
    wrapListener: vi.fn((listener) => (data?: string) => { if (data) listener(data); }),
  },
  BridgeInternal: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(true),
    send: vi.fn().mockResolvedValue({}),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    supports: vi.fn(),
    isAvailable: vi.fn(),
    handleCoreEvent: vi.fn(),
  })),
  BridgeBase: vi.fn().mockImplementation((internal) => ({
    init: internal.init,
    send: internal.send,
    subscribe: internal.subscribe,
    unsubscribe: internal.unsubscribe,
    supports: internal.supports,
    isAvailable: internal.isAvailable,
  })),
}));

// Mock react-native-webview as a class component so that `ref` resolves to an
// instance exposing injectJavaScript (React only forwards refs to class /
// forwardRef components, not plain function components).
const { injectJavaScript, webViewProps } = vi.hoisted(() => ({
  injectJavaScript: vi.fn(),
  webViewProps: vi.fn(),
}));
vi.mock('react-native-webview', async () => {
  const ReactModule = await import('react');
  class WebView extends ReactModule.Component {
    injectJavaScript = injectJavaScript;
    constructor(props: unknown) {
      super(props as never);
      webViewProps(props);
    }
    render() {
      return null;
    }
  }
  return { WebView };
});

describe('useAspectlyWebView (react-native)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook return values', () => {
    it('should return bridge, loaded state, and WebViewComponent', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [bridge, loaded, WebViewComponent] = result.current;

      expect(bridge).toBeDefined();
      expect(typeof loaded).toBe('boolean');
      expect(typeof WebViewComponent).toBe('function');
    });

    it('should initially have loaded as false', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [, loaded] = result.current;
      expect(loaded).toBe(false);
    });
  });

  describe('bridge instance', () => {
    it('should have init method', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [bridge] = result.current;
      expect(typeof bridge.init).toBe('function');
    });

    it('should have send method', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [bridge] = result.current;
      expect(typeof bridge.send).toBe('function');
    });

    it('should have subscribe method', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [bridge] = result.current;
      expect(typeof bridge.subscribe).toBe('function');
    });

    it('should have unsubscribe method', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [bridge] = result.current;
      expect(typeof bridge.unsubscribe).toBe('function');
    });
  });

  describe('event injection', () => {
    it('should inject a script that ends with `true;` to avoid iOS WKWebView crashes', async () => {
      const { BridgeInternal } = await import('@aspectly/core');
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [, , WebViewComponent] = result.current;
      render(<WebViewComponent />);

      // The bridge event sender is the first arg passed to BridgeInternal.
      const sendEvent = (BridgeInternal as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0][0] as (event: object) => void;
      sendEvent({ type: 'Init', data: { methods: ['a'] } });

      expect(injectJavaScript).toHaveBeenCalledTimes(1);
      const script = injectJavaScript.mock.calls[0][0] as string;
      expect(script.trimEnd().endsWith('true;')).toBe(true);
    });

    it('should safely escape payloads containing quotes and newlines', async () => {
      const { BridgeInternal } = await import('@aspectly/core');
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [, , WebViewComponent] = result.current;
      render(<WebViewComponent />);

      const sendEvent = (BridgeInternal as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0][0] as (event: object) => void;
      const payload = { type: 'Result', data: { text: `it's a "test"\nnewline` } };
      sendEvent(payload);

      const script = injectJavaScript.mock.calls[0][0] as string;
      // The injected script must be syntactically valid: extract the string
      // literal handed to MessageEvent and confirm it round-trips to the payload.
      const match = script.match(/\{data: (.*)\}\)\);/s);
      expect(match).not.toBeNull();
      const injectedLiteral = match![1];
      // Inner value is the JSON produced by wrapBridgeEvent; outer JSON.parse
      // undoes the escaping applied for the JS string literal.
      const innerJson = JSON.parse(injectedLiteral) as string;
      expect(JSON.parse(innerJson)).toEqual({ type: 'BridgeEvent', event: payload });
    });
  });

  describe('WebViewComponent', () => {
    it('should be a valid React component', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [, , WebViewComponent] = result.current;
      expect(WebViewComponent).toBeDefined();
    });
  });

  describe('memoization', () => {
    it('should return same bridge instance across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const firstBridge = result.current[0];
      rerender();
      const secondBridge = result.current[0];

      expect(firstBridge).toBe(secondBridge);
    });

    it('should return same component across re-renders with same url', () => {
      const { result, rerender } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const firstComponent = result.current[2];
      rerender();
      const secondComponent = result.current[2];

      expect(firstComponent).toBe(secondComponent);
    });
  });

  describe('options', () => {
    it('should accept timeout option', () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com', timeout: 5000 })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('WebView configuration', () => {
    it('should WebViewComponent receive correct source.uri from url option', async () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com/app' })
      );

      const [, , WebViewComponent] = result.current;

      // Render the component
      render(<WebViewComponent />);

      // Verify WebView was constructed with the correct source
      expect(webViewProps).toHaveBeenCalledWith(
        expect.objectContaining({
          source: { uri: 'https://example.com/app' }
        })
      );
    });

    it('should WebViewComponent have javaScriptEnabled=true', async () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [, , WebViewComponent] = result.current;

      render(<WebViewComponent />);

      expect(webViewProps).toHaveBeenCalledWith(
        expect.objectContaining({
          javaScriptEnabled: true
        })
      );
    });

    it('should WebViewComponent have mixedContentMode="always"', async () => {
      const { result } = renderHook(() =>
        useAspectlyWebView({ url: 'https://example.com' })
      );

      const [, , WebViewComponent] = result.current;

      render(<WebViewComponent />);

      expect(webViewProps).toHaveBeenCalledWith(
        expect.objectContaining({
          mixedContentMode: 'always'
        })
      );
    });
  });
});
