import { PdfExtractorBridge } from './PdfExtractorBridge';
import { PdfPasswordRequiredError, PdfReaderStuckError } from './types';

// Fake timers for the whole file: every request arms a timeout.
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function sentRequestId(sent: string[], index: number): string {
  return JSON.parse(sent[index]).requestId;
}

test('resolves with pages on a result message', async () => {
  const sent: string[] = [];
  const bridge = new PdfExtractorBridge((payload) => sent.push(payload));
  bridge.markReady();

  const promise = bridge.request('base64data');
  const requestId = sentRequestId(sent, 0);
  bridge.handleIncomingMessage(
    JSON.stringify({ requestId, type: 'result', pages: [{ pageNumber: 1, items: [] }] })
  );

  await expect(promise).resolves.toEqual({ pages: [{ pageNumber: 1, items: [] }] });
});

test('rejects with PdfPasswordRequiredError on password_required', async () => {
  const sent: string[] = [];
  const bridge = new PdfExtractorBridge((payload) => sent.push(payload));
  bridge.markReady();

  const promise = bridge.request('base64data');
  const requestId = sentRequestId(sent, 0);
  bridge.handleIncomingMessage(JSON.stringify({ requestId, type: 'password_required' }));

  await expect(promise).rejects.toBeInstanceOf(PdfPasswordRequiredError);
});

test('rejects with a plain error on an error message', async () => {
  const sent: string[] = [];
  const bridge = new PdfExtractorBridge((payload) => sent.push(payload));
  bridge.markReady();

  const promise = bridge.request('base64data');
  const requestId = sentRequestId(sent, 0);
  bridge.handleIncomingMessage(
    JSON.stringify({ requestId, type: 'error', message: 'boom' })
  );

  await expect(promise).rejects.toThrow('boom');
});

test('queues sends until ready, then flushes in order', () => {
  const sent: string[] = [];
  const bridge = new PdfExtractorBridge((payload) => sent.push(payload));

  bridge.request('first').catch(() => {});
  bridge.request('second').catch(() => {});
  expect(sent).toHaveLength(0);

  bridge.markReady();
  expect(sent).toHaveLength(2);
  expect(JSON.parse(sent[0]).base64).toBe('first');
  expect(JSON.parse(sent[1]).base64).toBe('second');
});

test('correlates two concurrent requests by requestId without crossing results', async () => {
  const sent: string[] = [];
  const bridge = new PdfExtractorBridge((payload) => sent.push(payload));
  bridge.markReady();

  const promiseA = bridge.request('a');
  const promiseB = bridge.request('b');
  const idA = sentRequestId(sent, 0);
  const idB = sentRequestId(sent, 1);
  expect(idA).not.toBe(idB);

  // Resolve B first, then A, to prove correlation isn't order-dependent.
  bridge.handleIncomingMessage(
    JSON.stringify({ requestId: idB, type: 'result', pages: [{ pageNumber: 2, items: [] }] })
  );
  bridge.handleIncomingMessage(
    JSON.stringify({ requestId: idA, type: 'result', pages: [{ pageNumber: 1, items: [] }] })
  );

  await expect(promiseA).resolves.toEqual({ pages: [{ pageNumber: 1, items: [] }] });
  await expect(promiseB).resolves.toEqual({ pages: [{ pageNumber: 2, items: [] }] });
});

describe('recovery', () => {
  test('no ack: rejects with PdfReaderStuckError and calls onReset', async () => {
    const onReset = jest.fn();
    const bridge = new PdfExtractorBridge(() => {}, onReset);
    bridge.markReady();

    const promise = bridge.request('x');
    const assertion = expect(promise).rejects.toBeInstanceOf(PdfReaderStuckError);
    jest.advanceTimersByTime(10_000);

    await assertion;
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('acked request survives past the ack timeout, then hits the extraction ceiling', async () => {
    const sent: string[] = [];
    const bridge = new PdfExtractorBridge((payload) => sent.push(payload));
    bridge.markReady();

    const promise = bridge.request('x');
    const settled = jest.fn();
    promise.catch(settled);
    bridge.handleIncomingMessage(JSON.stringify({ requestId: sentRequestId(sent, 0), type: 'ack' }));

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    const assertion = expect(promise).rejects.toBeInstanceOf(PdfReaderStuckError);
    jest.advanceTimersByTime(60_000);
    await assertion;
  });

  test('reset rejects pending, clears the queue, and needs markReady before sending again', async () => {
    const sent: string[] = [];
    const bridge = new PdfExtractorBridge((payload) => sent.push(payload));

    const stale = bridge.request('old'); // queued: never marked ready
    const assertion = expect(stale).rejects.toBeInstanceOf(PdfReaderStuckError);
    bridge.reset('render-gone');
    await assertion;

    bridge.request('new').catch(() => {});
    bridge.markReady();
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]).base64).toBe('new');
  });

  test('a late reply to a timed-out request is ignored', async () => {
    const sent: string[] = [];
    const bridge = new PdfExtractorBridge((payload) => sent.push(payload));
    bridge.markReady();

    const promise = bridge.request('x');
    const assertion = expect(promise).rejects.toBeInstanceOf(PdfReaderStuckError);
    const requestId = sentRequestId(sent, 0);
    jest.advanceTimersByTime(10_000);
    await assertion;

    expect(() =>
      bridge.handleIncomingMessage(JSON.stringify({ requestId, type: 'result', pages: [] }))
    ).not.toThrow();
  });
});
