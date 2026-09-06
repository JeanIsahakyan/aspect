import React, {
  Component,
  ComponentClass,
  FunctionComponent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { WebView as BaseWebView, WebViewProps } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import {
  BridgeCore,
  BridgeInternal,
  BridgeBase,
  BridgeOptions,
} from '@aspectly/core';

/**
 * Options for the useAspectlyWebView hook
 */
export interface UseAspectlyWebViewOptions extends BridgeOptions {
  /** URL to load in the WebView */
  url: string;
}

/**
 * Props for the WebView component
 */
export interface AspectlyWebViewProps extends Omit<WebViewProps, 'source' | 'onMessage' | 'onLoad' | 'ref'> {
  /** Optional error handler */
  onError?: (error: unknown) => void;
}

/**
 * Return type for useAspectlyWebView hook
 */
export type UseAspectlyWebViewReturn = [
  /** Bridge instance for communication */
  bridge: BridgeBase,
  /** Whether the WebView has loaded */
  loaded: boolean,
  /** React component to render the WebView */
  WebViewComponent: FunctionComponent<AspectlyWebViewProps>
];

/**
 * React hook for embedding a WebView and communicating with it via Aspectly bridge.
 *
 * @example
 * ```tsx
 * import { useAspectlyWebView } from '@aspectly/react-native';
 *
 * function App() {
 *   const [bridge, loaded, WebView] = useAspectlyWebView({
 *     url: 'https://example.com/app'
 *   });
 *
 *   useEffect(() => {
 *     if (loaded) {
 *       bridge.init({
 *         getDeviceInfo: async () => ({
 *           platform: Platform.OS,
 *           version: Platform.Version
 *         })
 *       });
 *     }
 *   }, [loaded, bridge]);
 *
 *   const handlePress = async () => {
 *     const result = await bridge.send('greet', { name: 'Native' });
 *     console.log(result);
 *   };
 *
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <WebView style={{ flex: 1 }} />
 *       <Button title="Send Message" onPress={handlePress} />
 *     </View>
 *   );
 * }
 * ```
 */
type NativeWebViewInstance = Component<WebViewProps> & {
  injectJavaScript: (script: string) => void;
};

const NativeWebView = BaseWebView as unknown as ComponentClass<WebViewProps>;

export const useAspectlyWebView = ({
  url,
  timeout,
}: UseAspectlyWebViewOptions): UseAspectlyWebViewReturn => {
  const webViewRef = useRef<NativeWebViewInstance | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);

  const bridge = useMemo(() => {
    return new BridgeInternal((event: object): void => {
      const bridgeEvent = BridgeCore.wrapBridgeEvent(event);
      // Use JSON.stringify to emit a properly escaped JS string literal so that
      // quotes, backslashes and newlines in the payload can't break the script.
      // The trailing `true;` is required: on iOS WKWebView serializes the result
      // of the injected script, and an IIFE returning `undefined` crashes there.
      webViewRef.current?.injectJavaScript(
        `(function() {
          window.dispatchEvent(new MessageEvent('message', {data: ${JSON.stringify(bridgeEvent)}}));
        })();
        true;`
      );
    }, { timeout });
  }, [timeout]);

  const publicBridge = useMemo(() => new BridgeBase(bridge), [bridge]);

  const onLoad = useCallback(() => setLoaded(true), []);

  const onMessage = useMemo(
    () => {
      const triggerEvent = BridgeCore.wrapListener(
        bridge.handleCoreEvent as (event: unknown) => void
      );
      return (event: WebViewMessageEvent) => {
        if (event.nativeEvent?.data) {
          triggerEvent(event.nativeEvent.data);
        }
      };
    },
    [bridge]
  );

  const WebViewComponent: FunctionComponent<AspectlyWebViewProps> = useCallback(
    ({ style, onError, ...props }: AspectlyWebViewProps) => {
      return (
        <NativeWebView
          {...props}
          style={style}
          onLoad={onLoad}
          ref={webViewRef}
          javaScriptEnabled={true}
          mixedContentMode="always"
          source={{ uri: url }}
          onMessage={onMessage}
          onError={onError ? (syntheticEvent) => onError(syntheticEvent.nativeEvent) : undefined}
        />
      );
    },
    [url, onMessage, onLoad]
  );

  return [publicBridge, loaded, WebViewComponent];
};
