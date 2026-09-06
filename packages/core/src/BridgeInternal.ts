import type {
  BridgeData,
  BridgeEvent,
  BridgeHandler,
  BridgeHandlers,
  BridgeInitEvent,
  BridgeInitResultEvent,
  BridgeListener,
  BridgeOptions,
  BridgeRequestEvent,
  BridgeResultData,
  BridgeResultError,
  BridgeResultEvent,
} from './types';
import {
  BridgeErrorType,
  BridgeEventType,
  BridgeResultType,
} from './types';

/**
 * Creates a bridge event with the specified type and data
 */
export const internalEvent = (
  type: BridgeEventType,
  data: BridgeData
): BridgeEvent => ({
  type,
  data,
});

/**
 * Creates a result event
 */
export const internalResultEvent = (data: BridgeData): BridgeEvent =>
  internalEvent(BridgeEventType.Result, data);

interface InternalRequestPromise {
  reject: (error: BridgeResultError) => void;
  resolve: (result: BridgeResultData) => void;
}

interface InitPromise {
  reject: () => void;
  resolve: (success: boolean) => void;
}

type InternalEventSender = (event: BridgeEvent) => void;

const DEFAULT_TIMEOUT = 100000;

/**
 * BridgeInternal handles the business logic of the bridge protocol.
 * It manages request/response lifecycle, handler registration, and event routing.
 */
export class BridgeInternal {
  private requests: InternalRequestPromise[] = [];
  private handlers: BridgeHandlers = {};
  private available = false;
  private supportedMethods: string[] = [];
  private listeners: BridgeListener[] = [];
  private initPromise?: InitPromise;
  private initResultReceived = false;
  private readonly sendEvent: InternalEventSender;
  private readonly timeout: number;

  constructor(sendEvent: InternalEventSender, options?: BridgeOptions) {
    this.sendEvent = sendEvent;
    this.timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Reset bridge state for a new connection context.
   * Call this when the remote side has changed (e.g., new popup window).
   */
  public reset = (): void => {
    this.handlers = {};
    this.available = false;
    this.supportedMethods = [];
    this.initPromise = undefined;
    this.initResultReceived = false;
  };

  /**
   * Register a single handler for a method.
   * Can be called before or after init().
   */
  public registerHandler = (method: string, handler: BridgeHandler): void => {
    this.handlers[method] = handler;
  };

  /**
   * Remove a previously registered handler.
   */
  public unregisterHandler = (method: string): void => {
    delete this.handlers[method];
  };

  /**
   * Subscribe to all result events
   */
  public subscribe = (listener: BridgeListener): number => {
    return this.listeners.push(listener);
  };

  /**
   * Unsubscribe from result events
   */
  public unsubscribe = (listener: BridgeListener): void => {
    this.listeners = this.listeners.filter(
      (oldListener) => oldListener !== listener
    );
  };

  private checkDiff = (a: string[], b: string[]): boolean => {
    return (
      a.filter((x) => !b.includes(x)).length > 0 ||
      b.filter((x) => !a.includes(x)).length > 0
    );
  };

  /**
   * Initialize the bridge with handlers
   * @param handlers Map of method names to handler functions
   * @returns Promise that resolves when the other side acknowledges
   */
  public init = (handlers: BridgeHandlers = {}): Promise<boolean> => {
    const oldMethods = Object.keys(this.handlers);
    const newMethods = Object.keys(handlers);
    this.handlers = handlers;
    if (!this.checkDiff(oldMethods, newMethods)) {
      return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
      this.initPromise = { resolve, reject };
      this.sendEvent(
        internalEvent(BridgeEventType.Init, {
          methods: newMethods,
        })
      );
    });
  };

  /**
   * Handle incoming bridge events
   */
  public handleCoreEvent = (event: BridgeEvent): void => {
    const { type, data } = event;
    switch (type) {
      case BridgeEventType.Init:
        this.handleInit(data as BridgeInitEvent);
        break;
      case BridgeEventType.InitResult:
        this.handleInitResult(data as BridgeInitResultEvent);
        break;
      case BridgeEventType.Request:
        this.handleRequest(data as BridgeRequestEvent);
        break;
      case BridgeEventType.Result:
        this.handleResult(data as BridgeResultEvent);
        break;
    }
  };

  /**
   * Handle incoming requests and execute the appropriate handler
   */
  public handleRequest = (request: BridgeRequestEvent): void => {
    const { method, params, request_id } = request;
    new Promise<BridgeResultData>((resolve, reject) => {
      let timeout = false;
      if (!Object.prototype.hasOwnProperty.call(this.handlers, method)) {
        reject({
          error_type: BridgeErrorType.UNSUPPORTED_METHOD,
          error: new Error(`Handler for «${method}» is not registered`),
        });
        return;
      }
      const timer = setTimeout(() => {
        timeout = true;
        reject({
          error_type: BridgeErrorType.METHOD_EXECUTION_TIMEOUT,
          error: new Error('Execution timeout exceeded'),
        });
      }, this.timeout);
      const handler = this.handlers[method];
      if (!handler) {
        reject({
          error_type: BridgeErrorType.UNSUPPORTED_METHOD,
          error: new Error(`Handler for «${method}» is undefined`),
        });
        return;
      }
      handler(params)
        .then((result) => {
          if (timeout) {
            return;
          }
          clearTimeout(timer);
          resolve(result as BridgeResultData);
        })
        .catch((error: Error) => {
          if (timeout) {
            return;
          }
          clearTimeout(timer);
          reject({
            error_type: BridgeErrorType.REJECTED,
            error: error,
          });
        });
    })
      .then((data: BridgeResultData) => {
        this.sendEvent(
          internalResultEvent({
            type: BridgeResultType.Success,
            data,
            method,
            request_id,
          })
        );
      })
      .catch(
        ({
          error_type,
          error,
        }: {
          error_type: BridgeErrorType;
          error: Error;
        }) => {
          this.sendEvent(
            internalResultEvent({
              type: BridgeResultType.Error,
              request_id,
              method,
              data: {
                error_message: error.message,
                error_type,
              },
            })
          );
        }
      );
  };

  private handleResult = (result: BridgeResultEvent): void => {
    this.handleRequestResult(result);
    this.listeners.forEach((listener) => listener(result));
  };

  private handleRequestResult = (result: BridgeResultEvent): void => {
    if (!result || !Object.prototype.hasOwnProperty.call(result, 'request_id')) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(result, 'type')) {
      console.warn('unknown result', result);
      return;
    }
    const { request_id, data, type } = result;
    const request = this.requests[Number(request_id)];
    if (!request) {
      return;
    }
    if (type === BridgeResultType.Success) {
      request.resolve(data);
      return;
    }
    if (type === BridgeResultType.Error) {
      request.reject((data || result.error) as BridgeResultError);
    }
  };

  private handleInit = (data: BridgeInitEvent): void => {
    this.available = true;
    this.supportedMethods = data.methods;
    this.sendEvent(internalEvent(BridgeEventType.InitResult, true));
    // Receiving Init from the other side means it's alive and ready.
    // If our Init was lost (sent before the other side was listening),
    // we'll never get an explicit InitResult — so treat receiving
    // their Init as implicit confirmation.
    this.initResultReceived = true;
    this.tryResolveInit();
  };

  private handleInitResult = (success: BridgeInitResultEvent): void => {
    if (success) {
      // Receiving an InitResult means the other side acknowledged our Init, so
      // it is alive and ready — mark it available here too. Without this, a side
      // that missed the peer's Init (e.g. the host broadcast it before the
      // mini-app subscribed) would only ever see the InitResult, leaving
      // `available` false and its init() promise unresolved until timeout.
      // Note: InitResult carries no method list, so `supports()` may be
      // incomplete for a side that only received an InitResult; `send()` gates
      // on isAvailable() only, so calls still work.
      this.available = true;
      this.initResultReceived = true;
      this.tryResolveInit();
    } else {
      this.initPromise?.reject();
    }
  };

  private tryResolveInit = (): void => {
    if (this.initResultReceived && this.available) {
      this.initPromise?.resolve(true);
    }
  };

  /**
   * Send a request to the other side
   * @param method Method name to invoke
   * @param params Parameters to pass to the method
   * @returns Promise that resolves with the result
   */
  public send = <TResult = unknown>(
    method: string,
    params: object
  ): Promise<TResult> =>
    new Promise((resolve, reject) => {
      const request_id = (
        this.requests.push({ resolve: resolve as (result: BridgeResultData) => void, reject }) - 1
      ).toString();
      if (!this.isAvailable()) {
        this.handleCoreEvent(
          internalResultEvent({
            type: BridgeResultType.Error,
            request_id,
            method,
            data: {
              error_message: 'Bridge is not available',
              error_type: BridgeErrorType.BRIDGE_NOT_AVAILABLE,
            },
          })
        );
        return;
      }
      this.sendEvent(
        internalEvent(BridgeEventType.Request, {
          method,
          params,
          request_id,
        })
      );
    });

  /**
   * Check if a method is supported by the other side
   */
  public supports = (method: string): boolean =>
    this.supportedMethods.includes(method);

  /**
   * Check if the bridge is available (initialized)
   */
  public isAvailable = (): boolean => this.available;
}
