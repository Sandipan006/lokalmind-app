import type { ChatMessage } from '../../../domain/entities/ChatMessage';
import type { ChatSession } from '../../../domain/entities/ChatSession';
import { ChatViewModel, MAX_PENDING_MESSAGE_QUEUE } from '../ChatViewModel';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@/src/core/logger', () => ({ logger: { debug: jest.fn() } }));

const session = { id: 's1', modelId: 'm1', title: 't' } as unknown as ChatSession;

function assistant(content: string): ChatMessage {
  return { id: `a_${content}`, sessionId: 's1', role: 'assistant', content, status: 'done', createdAt: 1 };
}

type Execute = (p: { userMessage: ChatMessage; onToken: (t: string) => void; signal: AbortSignal }) => Promise<unknown>;

function setup(execute: Execute, extra: { edit?: unknown; regen?: unknown } = {}) {
  const sendUse = { execute: jest.fn(execute) };
  const titleUse = { execute: jest.fn(async () => ({ success: true, data: 't' })) };
  const vm = new ChatViewModel(
    {} as never, {} as never, {} as never,
    sendUse as never, (extra.edit ?? {}) as never, titleUse as never, {} as never, (extra.regen ?? {}) as never,
    {} as never,
  );
  vm.session = session;
  return { vm, sendUse };
}

describe('ChatViewModel send', () => {
  test('a successful turn adds the user bubble and the assistant reply', async () => {
    const { vm } = setup(async ({ onToken }) => {
      onToken('hi');
      return { success: true, data: assistant('hi there') };
    });
    vm.setInputText('hello');
    await vm.sendMessage();
    expect(vm.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(vm.isStreaming).toBe(false);
    expect(vm.inputText).toBe('');
    expect(vm.error).toBeNull();
  });

  test('a failed turn shows the error and leaves no streaming bubble', async () => {
    const { vm } = setup(async () => ({ success: false, error: { code: 'DB_ERROR', message: 'save failed' } }));
    vm.setInputText('hello');
    await vm.sendMessage();
    expect(vm.error).toBe('save failed');
    expect(vm.isStreaming).toBe(false);
    expect(vm.messages.every((m) => m.status !== 'streaming')).toBe(true);
  });

  test('a thrown error is shown and ends streaming', async () => {
    const { vm } = setup(async () => { throw new Error('boom'); });
    vm.setInputText('hello');
    await vm.sendMessage();
    expect(vm.error).toBe('boom');
    expect(vm.isStreaming).toBe(false);
  });

  test('empty input is not sent', async () => {
    const { vm, sendUse } = setup(async () => ({ success: true, data: assistant('x') }));
    vm.setInputText('   ');
    await vm.sendMessage();
    expect(sendUse.execute).not.toHaveBeenCalled();
  });
});

describe('ChatViewModel queue', () => {
  test('messages sent while streaming are queued and sent in order after the turn', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { vm, sendUse } = setup(async ({ userMessage }) => {
      if (userMessage.content === 'first') await gate;
      return { success: true, data: assistant(`re:${userMessage.content}`) };
    });
    vm.setInputText('first');
    const running = vm.sendMessage();
    vm.setInputText('second');
    await vm.sendMessage();
    vm.setInputText('third');
    await vm.sendMessage();
    expect(vm.pendingQueue.map((q) => q.text)).toEqual(['second', 'third']);
    release();
    await running;
    const sent = sendUse.execute.mock.calls.map((c) => c[0].userMessage.content);
    expect(sent).toEqual(['first', 'second', 'third']);
    expect(vm.pendingQueue).toEqual([]);
  });

  test(`queue holds at most ${MAX_PENDING_MESSAGE_QUEUE} messages`, async () => {
    const gate = new Promise<void>(() => {});
    const { vm } = setup(async () => { await gate; return { success: true, data: assistant('x') }; });
    vm.setInputText('first');
    void vm.sendMessage();
    for (let i = 0; i < MAX_PENDING_MESSAGE_QUEUE + 2; i++) {
      vm.setInputText(`q${i}`);
      await vm.sendMessage();
    }
    expect(vm.pendingQueue).toHaveLength(MAX_PENDING_MESSAGE_QUEUE);
  });

  test('a cancelled queued message is not sent', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { vm, sendUse } = setup(async ({ userMessage }) => {
      if (userMessage.content === 'first') await gate;
      return { success: true, data: assistant('x') };
    });
    vm.setInputText('first');
    const running = vm.sendMessage();
    vm.setInputText('second');
    await vm.sendMessage();
    vm.cancelQueuedMessage(vm.pendingQueue[0]!.id);
    release();
    await running;
    expect(sendUse.execute).toHaveBeenCalledTimes(1);
  });
});

describe('ChatViewModel stop', () => {
  test('stopGeneration aborts the signal passed to the use case', async () => {
    let seen: AbortSignal | undefined;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { vm } = setup(async ({ signal }) => {
      seen = signal;
      await gate;
      return { success: true, data: assistant('partial') };
    });
    vm.setInputText('go');
    const running = vm.sendMessage();
    vm.stopGeneration();
    expect(seen?.aborted).toBe(true);
    release();
    await running;
  });
});

describe('ChatViewModel edit', () => {
  const userMsg: ChatMessage = { id: 'u1', sessionId: 's1', role: 'user', content: 'old', status: 'done', createdAt: 0 };
  const edited = { ...userMsg, content: 'new' };
  const editOk = { execute: jest.fn(async () => ({ success: true, data: { updatedMessage: edited, historyBefore: [] } })) };

  test('an edit resends the edited message and shows the new reply', async () => {
    const { vm, sendUse } = setup(async () => ({ success: true, data: assistant('answer') }), { edit: editOk });
    vm.messages = [userMsg, assistant('old answer')];
    vm.startEdit(userMsg);
    vm.setInputText('new');
    await vm.submitEdit();
    expect(sendUse.execute.mock.calls[0]![0].userMessage.content).toBe('new');
    expect(vm.messages.map((m) => m.content)).toEqual(['new', 'answer']);
    expect(vm.isStreaming).toBe(false);
  });

  test('a failed edit save shows the error and does not generate', async () => {
    const editFail = { execute: jest.fn(async () => ({ success: false, error: { code: 'DB_ERROR', message: 'nope' } })) };
    const { vm, sendUse } = setup(async () => ({ success: true, data: assistant('x') }), { edit: editFail });
    vm.messages = [userMsg];
    vm.startEdit(userMsg);
    vm.setInputText('new');
    await vm.submitEdit();
    expect(vm.error).toBe('nope');
    expect(vm.isStreaming).toBe(false);
    expect(sendUse.execute).not.toHaveBeenCalled();
  });

  test('a throw during an edit turn ends streaming and shows the error', async () => {
    const { vm } = setup(async () => { throw new Error('boom'); }, { edit: editOk });
    vm.messages = [userMsg];
    vm.startEdit(userMsg);
    vm.setInputText('new');
    await vm.submitEdit();
    expect(vm.isStreaming).toBe(false);
    expect(vm.error).toBe('boom');
  });
});

describe('ChatViewModel regenerate', () => {
  const user: ChatMessage = { id: 'u1', sessionId: 's1', role: 'user', content: 'q', status: 'done', createdAt: 1 };
  const old = assistant('old');

  test('regenerate replaces the last reply', async () => {
    const regen = { execute: jest.fn(async () => ({ success: true, data: { ...old, content: 'fresh' } })) };
    const { vm } = setup(async () => ({ success: true, data: old }), { regen });
    vm.messages = [user, old];
    await vm.regenerateLastReply();
    expect(vm.messages.map((m) => m.content)).toEqual(['q', 'fresh']);
    expect(vm.regeneratingMessageId).toBeNull();
    expect(vm.isStreaming).toBe(false);
  });

  test('a failed regenerate keeps the old reply and shows the error', async () => {
    const regen = { execute: jest.fn(async () => ({ success: false, error: { code: 'DB_ERROR', message: 'nope' } })) };
    const { vm } = setup(async () => ({ success: true, data: old }), { regen });
    vm.messages = [user, old];
    await vm.regenerateLastReply();
    expect(vm.messages.map((m) => m.content)).toEqual(['q', 'old']);
    expect(vm.error).toBe('nope');
  });

  test('a throw during regenerate ends streaming and shows the error', async () => {
    const regen = { execute: jest.fn(async () => { throw new Error('boom'); }) };
    const { vm } = setup(async () => ({ success: true, data: old }), { regen });
    vm.messages = [user, old];
    await vm.regenerateLastReply();
    expect(vm.isStreaming).toBe(false);
    expect(vm.regeneratingMessageId).toBeNull();
    expect(vm.error).toBe('boom');
  });
});
