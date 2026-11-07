import { DownloadService } from '../downloadService';

const mockDelete = jest.fn(async (..._args: unknown[]) => {});
const mockInfo = jest.fn();
const mockCreate = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  createDownloadResumable: (...a: unknown[]) => mockCreate(...a),
  deleteAsync: (...a: unknown[]) => mockDelete(...a),
  getInfoAsync: (...a: unknown[]) => mockInfo(...a),
  makeDirectoryAsync: jest.fn(async () => {}),
}), { virtual: true });

const store = new Map<string, string>();
const driver = {
  getItem: async (k: string) => store.get(k) ?? null,
  setItem: async (k: string, v: string) => void store.set(k, v),
  removeItem: async (k: string) => void store.delete(k),
  getAllKeys: async () => [...store.keys()],
} as never;

const config = { modelId: 'm1', url: 'https://x/m.gguf', destinationPath: '/d/m.gguf.part', expectedBytes: 100 };

function resumable(overrides: Record<string, unknown>) {
  return {
    downloadAsync: async () => ({ uri: config.destinationPath, ...overrides }),
    pauseAsync: async () => ({ resumeData: 'resume-data' }),
    cancelAsync: jest.fn(async () => {}),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
});

describe('DownloadService', () => {
  test('a complete download finishes and clears resume state', async () => {
    mockCreate.mockReturnValue(resumable({ status: 200, headers: { 'content-length': '100' } }));
    const s = new DownloadService(driver);
    await s.startDownload(config, () => {});
    expect(mockDelete).not.toHaveBeenCalled();
    expect(s.getActiveDownloadIds()).toEqual([]);
    expect(store.size).toBe(0);
  });

  test('a non-success response deletes the file and fails', async () => {
    mockCreate.mockReturnValue(resumable({ status: 404 }));
    const s = new DownloadService(driver);
    await expect(s.startDownload(config, () => {})).rejects.toThrow('HTTP 404');
    expect(mockDelete).toHaveBeenCalledWith(config.destinationPath, { idempotent: true });
  });

  test('a truncated file is deleted and the download fails', async () => {
    mockCreate.mockReturnValue(resumable({ status: 200, headers: { 'content-length': '100' } }));
    mockInfo.mockResolvedValue({ exists: true, size: 40 });
    const s = new DownloadService(driver);
    await expect(s.startDownload(config, () => {})).rejects.toThrow('40 of 100');
    expect(mockDelete).toHaveBeenCalled();
  });

  test('pause returns resume data; cancel removes the partial file and the state', async () => {
    let finish!: (v: undefined) => void;
    const r = resumable({});
    (r as { downloadAsync: () => Promise<unknown> }).downloadAsync = () => new Promise((res) => { finish = res as (v: undefined) => void; });
    mockCreate.mockReturnValue(r);
    const s = new DownloadService(driver);
    const running = s.startDownload(config, () => {});
    await new Promise((res) => setTimeout(res, 0));
    expect(await s.pauseDownload('m1')).toBe('resume-data');
    expect(s.getDownloadState('m1')?.status).toBe('paused');
    await s.cancelDownload('m1');
    expect(r.cancelAsync).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith(config.destinationPath, { idempotent: true });
    expect(s.getActiveDownloadIds()).toEqual([]);
    finish(undefined);
    await running;
  });
});
