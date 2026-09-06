import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BridgeInternal } from './BridgeInternal';
import { BridgeEventType, BridgeResultType, BridgeErrorType } from './types';

describe('BridgeInternal', () => {
  let sendEvent: ReturnType<typeof vi.fn>;
  let bridge: BridgeInternal;

  beforeEach(() => {
    sendEvent = vi.fn();
    bridge = new BridgeInternal(sendEvent);
  });

  describe('init', () => {
    it('should send Init event with methods', () => {
      const handlers = {
        greet: async () => ({ message: 'hello' }),
        getData: async () => ({ data: 'value' }),
      };

      bridge.init(handlers);

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Init,
        data: {
          methods: ['greet', 'getData'],
        },
      });
    });

    it('should resolve immediately if called with empty handlers', async () => {
      const result = await bridge.init({});
      expect(result).toBe(true);
      expect(sendEvent).not.toHaveBeenCalled();
    });

    it('should return promise that resolves when both Init and InitResult received', async () => {
      const handlers = {
        greet: async () => ({ message: 'hello' }),
      };

      const initPromise = bridge.init(handlers);

      // Simulate receiving Init from other side (sets available + supportedMethods)
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: ['remoteMethod'] },
      });

      // Simulate receiving InitResult (confirms our Init was acknowledged)
      bridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });

      await expect(initPromise).resolves.toBe(true);
      expect(bridge.isAvailable()).toBe(true);
      expect(bridge.supports('remoteMethod')).toBe(true);
    });

    it('should resolve init when InitResult arrives before Init', async () => {
      const handlers = {
        greet: async () => ({ message: 'hello' }),
      };

      const initPromise = bridge.init(handlers);

      // InitResult first
      bridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });

      // Init second
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: ['remoteMethod'] },
      });

      await expect(initPromise).resolves.toBe(true);
    });

    it('should resolve init when only InitResult is received (peer Init missed)', async () => {
      // Race: the peer broadcast its Init before we subscribed, so we never
      // receive its Init — only the InitResult acknowledging our own Init.
      // The handshake must still complete and the bridge become available.
      const handlers = {
        greet: async () => ({ message: 'hello' }),
      };

      const initPromise = bridge.init(handlers);

      bridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });

      await expect(initPromise).resolves.toBe(true);
      expect(bridge.isAvailable()).toBe(true);
    });
  });

  describe('handleCoreEvent', () => {
    it('should handle Init event and send InitResult', () => {
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: ['test'] },
      });

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.InitResult,
        data: true,
      });
      expect(bridge.isAvailable()).toBe(true);
      expect(bridge.supports('test')).toBe(true);
    });

    it('should handle Request event and call handler', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      // First initialize the bridge by receiving Init from other side
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: [] },
      });

      // Start init and simulate InitResult response
      const initPromise = bridge.init({ greet: handler });
      bridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });
      await initPromise;
      sendEvent.mockClear();

      bridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: {
          method: 'greet',
          params: { name: 'John' },
          request_id: '1',
        },
      });

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledWith({ name: 'John' });
    });

    it('should send success result after handler completes', async () => {
      const handler = vi.fn().mockResolvedValue({ message: 'Hello!' });

      // Initialize bridge
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: [] },
      });

      const initPromise = bridge.init({ greet: handler });
      bridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });
      await initPromise;
      sendEvent.mockClear();

      bridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: {
          method: 'greet',
          params: {},
          request_id: '1',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Success,
          data: { message: 'Hello!' },
          method: 'greet',
          request_id: '1',
        },
      });
    });

    it('should send error result for unsupported methods', async () => {
      bridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: {
          method: 'unknownMethod',
          params: {},
          request_id: '1',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Error,
          request_id: '1',
          method: 'unknownMethod',
          data: {
            error_message: expect.any(String),
            error_type: BridgeErrorType.UNSUPPORTED_METHOD,
          },
        },
      });
    });

    it('should send error result when handler throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      // Initialize bridge
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: [] },
      });

      const initPromise = bridge.init({ failing: handler });
      bridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });
      await initPromise;
      sendEvent.mockClear();

      bridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: {
          method: 'failing',
          params: {},
          request_id: '1',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Error,
          request_id: '1',
          method: 'failing',
          data: {
            error_message: 'Handler error',
            error_type: BridgeErrorType.REJECTED,
          },
        },
      });
    });
  });

  describe('send', () => {
    beforeEach(() => {
      // Initialize bridge
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: ['test'] },
      });
    });

    it('should send request event', () => {
      bridge.send('test', { foo: 'bar' });

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Request,
        data: {
          method: 'test',
          params: { foo: 'bar' },
          request_id: expect.any(String),
        },
      });
    });

    it('should resolve promise on success result', async () => {
      const promise = bridge.send<{ message: string }>('test', {});

      // Simulate result
      bridge.handleCoreEvent({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Success,
          data: { message: 'success' },
          request_id: '0',
          method: 'test',
        },
      });

      await expect(promise).resolves.toEqual({ message: 'success' });
    });

    it('should reject promise on error result', async () => {
      const promise = bridge.send('test', {});

      bridge.handleCoreEvent({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Error,
          data: {
            error_type: BridgeErrorType.REJECTED,
            error_message: 'Failed',
          },
          request_id: '0',
          method: 'test',
        },
      });

      await expect(promise).rejects.toEqual({
        error_type: BridgeErrorType.REJECTED,
        error_message: 'Failed',
      });
    });

    it('should reject with BRIDGE_NOT_AVAILABLE when not initialized', async () => {
      const uninitializedBridge = new BridgeInternal(sendEvent);
      const promise = uninitializedBridge.send('test', {});

      await expect(promise).rejects.toEqual({
        error_type: BridgeErrorType.BRIDGE_NOT_AVAILABLE,
        error_message: 'Bridge is not available',
      });
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should notify listeners on result events', () => {
      const listener = vi.fn();
      bridge.subscribe(listener);

      bridge.handleCoreEvent({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Success,
          data: { foo: 'bar' },
          method: 'test',
        },
      });

      expect(listener).toHaveBeenCalledWith({
        type: BridgeResultType.Success,
        data: { foo: 'bar' },
        method: 'test',
      });
    });

    it('should stop notifying after unsubscribe', () => {
      const listener = vi.fn();
      bridge.subscribe(listener);
      bridge.unsubscribe(listener);

      bridge.handleCoreEvent({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Success,
          data: {},
          method: 'test',
        },
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('registerHandler/unregisterHandler', () => {
    it('should register a handler that can be called via Request', async () => {
      const handler = vi.fn().mockResolvedValue({ ok: true });
      bridge.registerHandler('myMethod', handler);

      bridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: { method: 'myMethod', params: { x: 1 }, request_id: '1' },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledWith({ x: 1 });
      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Success,
          data: { ok: true },
          method: 'myMethod',
          request_id: '1',
        },
      });
    });

    it('should unregister a handler', async () => {
      bridge.registerHandler('myMethod', vi.fn().mockResolvedValue({}));
      bridge.unregisterHandler('myMethod');

      bridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: { method: 'myMethod', params: {}, request_id: '1' },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Result,
        data: expect.objectContaining({
          type: BridgeResultType.Error,
          data: expect.objectContaining({
            error_type: BridgeErrorType.UNSUPPORTED_METHOD,
          }),
        }),
      });
    });

    it('should include registerHandler methods in init', () => {
      bridge.registerHandler('pre1', vi.fn().mockResolvedValue({}));
      bridge.registerHandler('pre2', vi.fn().mockResolvedValue({}));

      bridge.init({
        pre1: vi.fn().mockResolvedValue({}),
        pre2: vi.fn().mockResolvedValue({}),
        extra: vi.fn().mockResolvedValue({}),
      });

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Init,
        data: { methods: ['pre1', 'pre2', 'extra'] },
      });
    });
  });

  describe('supports', () => {
    it('should return false before initialization', () => {
      expect(bridge.supports('test')).toBe(false);
    });

    it('should return true for supported methods after init', () => {
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: ['greet', 'getData'] },
      });

      expect(bridge.supports('greet')).toBe(true);
      expect(bridge.supports('getData')).toBe(true);
      expect(bridge.supports('unknown')).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return false before initialization', () => {
      expect(bridge.isAvailable()).toBe(false);
    });

    it('should return true after Init event', () => {
      bridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: [] },
      });

      expect(bridge.isAvailable()).toBe(true);
    });
  });

  describe('timeout', () => {
    it('should use custom timeout from options', async () => {
      vi.useFakeTimers();

      const customBridge = new BridgeInternal(sendEvent, { timeout: 100 });

      // Initialize bridge first
      customBridge.handleCoreEvent({
        type: BridgeEventType.Init,
        data: { methods: [] },
      });

      const slowHandler = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );
      const initPromise = customBridge.init({ slow: slowHandler });
      customBridge.handleCoreEvent({
        type: BridgeEventType.InitResult,
        data: true,
      });
      await initPromise;
      sendEvent.mockClear();

      customBridge.handleCoreEvent({
        type: BridgeEventType.Request,
        data: {
          method: 'slow',
          params: {},
          request_id: '1',
        },
      });

      await vi.advanceTimersByTimeAsync(150);

      expect(sendEvent).toHaveBeenCalledWith({
        type: BridgeEventType.Result,
        data: {
          type: BridgeResultType.Error,
          request_id: '1',
          method: 'slow',
          data: {
            error_message: 'Execution timeout exceeded',
            error_type: BridgeErrorType.METHOD_EXECUTION_TIMEOUT,
          },
        },
      });

      vi.useRealTimers();
    });
  });
});
