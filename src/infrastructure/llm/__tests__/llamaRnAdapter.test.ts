import { LlamaRnAdapter } from '../llamaRnAdapter';

const mockInit = jest.fn();
const mockRelease = jest.fn(async () => {});

jest.mock('llama.rn', () => ({
  initLlama: (...a: unknown[]) => mockInit(...a),
  releaseAllLlama: jest.fn(async () => {}),
}));
jest.mock('expo-file-system', () => ({
  File: class { exists = true; uri = 'file:///m.gguf'; },
  Paths: { document: '' },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@/src/infrastructure/device/deviceCapability', () => ({ resolveContextSize: async () => 2048 }));
jest.mock('@/src/infrastructure/downloads/modelConfig', () => ({
  getModelConfig: (id: string) => ({ filename: `${id}.gguf`, sizeBytes: 1, contextSize: 2048, stopTokens: [] }),
}));

function fakeContext(completion: () => Promise<unknown>) {
  return { release: mockRelease, stopCompletion: jest.fn(), completion };
}
const done = { content: 'x', tokens_predicted: 1, tokens_evaluated: 1, stopped_eos: true };

beforeEach(() => { jest.clearAllMocks(); });

describe('LlamaRnAdapter queue', () => {
  test('a waiting initialize loads the model it asked for, not the one loaded before it', async () => {
    mockInit.mockImplementation(async () => fakeContext(async () => done));
    const a = new LlamaRnAdapter();
    await Promise.all([a.initialize('m1', { modelId: 'm1' }), a.initialize('m2', { modelId: 'm2' })]);
    expect(a.getCurrentModelId()).toBe('m2');
  });

  test('a queued generate with an aborted signal is skipped and does not wait', async () => {
    let finishFirst!: () => void;
    const completion = jest.fn()
      .mockImplementationOnce(() => new Promise((r) => { finishFirst = () => r(done); }))
      .mockImplementation(async () => done);
    mockInit.mockImplementation(async () => fakeContext(completion));
    const a = new LlamaRnAdapter();
    await a.initialize('m1', { modelId: 'm1' });
    const first = a.generateResponse([], { modelId: 'm1' });
    const ctrl = new AbortController();
    const queued = a.generateResponse([], { modelId: 'm1' }, undefined, ctrl.signal);
    ctrl.abort();
    await expect(queued).rejects.toThrow('Aborted');
    finishFirst();
    await first;
    expect(completion).toHaveBeenCalledTimes(1);
  });

  test('a model load that finishes after the timeout is released', async () => {
    jest.useFakeTimers();
    let resolveLate!: (c: unknown) => void;
    mockInit.mockImplementation(() => new Promise((r) => { resolveLate = r; }));
    const a = new LlamaRnAdapter();
    const p = a.initialize('m1', { modelId: 'm1' }).catch((e) => e);
    await jest.advanceTimersByTimeAsync(61_000);
    expect(String(await p)).toContain('timed out');
    resolveLate(fakeContext(async () => done));
    await jest.advanceTimersByTimeAsync(0);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(a.isModelLoaded()).toBe(false);
    jest.useRealTimers();
  });
});
