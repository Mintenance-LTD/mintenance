import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { LocalYOLOInferenceService } from '../LocalYOLOInferenceService';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), single: vi.fn(), eq: vi.fn(), download: vi.fn(),
  createSession: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, storage: { from: () => ({ download: mocks.download }) } },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('onnxruntime-node', () => ({ InferenceSession: { create: mocks.createSession } }));
vi.mock('../yolo-class-names', () => ({ loadClassNames: () => ['crack'] }));
vi.mock('../yolo-preprocessing', () => ({ preprocessImageForYOLO: vi.fn() }));
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  const mocked = { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
  return { ...mocked, default: mocked };
});

const bytes = Buffer.from('test-only ONNX contents; runtime is mocked');
let exitListeners: NodeJS.ExitListener[];

beforeEach(async () => {
  await LocalYOLOInferenceService.cleanup();
  vi.clearAllMocks();
  exitListeners = process.listeners('exit');
  const query = {
    select: vi.fn().mockReturnThis(), eq: mocks.eq.mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: mocks.single,
  };
  mocks.from.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: { model_data: bytes, file_size: bytes.length }, error: null });
  mocks.createSession.mockResolvedValue({});
});

afterEach(async () => {
  // Exercise the registered cleanup without emitting a real process exit.
  for (const listener of process.listeners('exit')) {
    if (!exitListeners.includes(listener)) {
      listener(0);
      process.removeListener('exit', listener);
    }
  }
  await LocalYOLOInferenceService.cleanup();
  vi.restoreAllMocks();
});

describe('LocalYOLOInferenceService temporary model files', () => {
  it.each(['yolov11', '../../../../outside', '..\\..\\outside'])('keeps model name %j out of the filesystem path', async (modelName) => {
    await LocalYOLOInferenceService.initialize({ loadFromDatabase: true, databaseModelName: modelName });
    const file = mocks.createSession.mock.calls[0][0] as string;
    expect(mocks.eq).toHaveBeenCalledWith('model_name', modelName);
    expect(basename(file)).toBe('model.onnx');
    expect(basename(dirname(file))).toMatch(/^mintenance-yolo-[a-zA-Z0-9]+$/);
    expect(resolve(dirname(dirname(file)))).toBe(resolve(tmpdir()));
    expect(readFileSync(file)).toEqual(bytes);
    expect(writeFileSync).toHaveBeenCalledWith(file, bytes, { flag: 'wx', mode: 0o600 });
    if (process.platform !== 'win32') {
      expect(statSync(file).mode & 0o777).toBe(0o600);
      expect(statSync(dirname(file)).mode & 0o777).toBe(0o700);
    }
    const listener = process.listeners('exit').find(item => !exitListeners.includes(item))!;
    listener(0);
    expect(existsSync(file)).toBe(false);
    expect(existsSync(dirname(file))).toBe(false);
  });

  it('isolates repeated loads in the same millisecond and preserves Storage downloads', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    mocks.single.mockResolvedValue({ data: {
      storage_path: 'model.onnx', storage_bucket: 'models', file_size: bytes.length,
      checksum: createHash('sha256').update(bytes).digest('hex'),
    }, error: null });
    mocks.download.mockResolvedValue({ data: { arrayBuffer: async () => bytes }, error: null });
    for (let i = 0; i < 2; i++) {
      await LocalYOLOInferenceService.initialize({ loadFromDatabase: true, databaseModelName: 'same-model' });
      await LocalYOLOInferenceService.cleanup();
    }
    const [first, second] = mocks.createSession.mock.calls.map(call => call[0] as string);
    expect(first).not.toBe(second);
    expect(readFileSync(first)).toEqual(bytes);
    expect(readFileSync(second)).toEqual(bytes);
  });

  it('removes its private directory when writing fails and never loads a partial model', async () => {
    let attemptedPath = '';
    vi.mocked(writeFileSync).mockImplementationOnce((file) => {
      attemptedPath = String(file);
      throw new Error('simulated disk failure');
    });
    await expect(LocalYOLOInferenceService.initialize({ loadFromDatabase: true })).rejects.toThrow('simulated disk failure');
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(attemptedPath).not.toBe('');
    expect(existsSync(dirname(attemptedPath))).toBe(false);
  });
});
