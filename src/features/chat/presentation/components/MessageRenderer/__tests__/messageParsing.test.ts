import { parseAtxHeadings, parseCodeBlocks, parseThinkBlocks } from '../messageParsing';

describe('parseThinkBlocks', () => {
  test('no think tag: all visible', () => {
    expect(parseThinkBlocks('hello')).toEqual({ thinkContent: null, visibleContent: 'hello', isThinkIncomplete: false });
  });
  test('complete block is split from the answer', () => {
    expect(parseThinkBlocks('<think> plan </think>\nAnswer')).toEqual({
      thinkContent: 'plan', visibleContent: 'Answer', isThinkIncomplete: false,
    });
  });
  test('open block while streaming', () => {
    expect(parseThinkBlocks('Hi <think>still thinking')).toEqual({
      thinkContent: 'still thinking', visibleContent: 'Hi', isThinkIncomplete: true,
    });
  });
});

describe('parseCodeBlocks', () => {
  test('text, code and text', () => {
    expect(parseCodeBlocks('a\n```js\nlet x\n```\nb', false)).toEqual([
      { type: 'text', value: 'a\n' },
      { type: 'code', lang: 'js', value: 'let x' },
      { type: 'text', value: 'b' },
    ]);
  });
  test('an open fence streams as code', () => {
    expect(parseCodeBlocks('```py\nprint(1)', true)).toEqual([{ type: 'code', lang: 'py', value: 'print(1)' }]);
  });
  test('a bare fence with no newline: code box only while streaming', () => {
    expect(parseCodeBlocks('x ```py', true).at(-1)).toEqual({ type: 'code', lang: 'py', value: '' });
    expect(parseCodeBlocks('x ```py', false).at(-1)).toEqual({ type: 'text', value: '```py' });
  });
  test('inline triple backticks inside a code line do not close the block', () => {
    expect(parseCodeBlocks('```\na ```b\n```', false)).toEqual([{ type: 'code', lang: '', value: 'a ```b' }]);
  });
});

describe('parseAtxHeadings', () => {
  test('heading lines lose their # prefix', () => {
    expect(parseAtxHeadings('### Title\nbody', false)).toEqual([
      { type: 'heading', level: 3, text: 'Title' },
      { type: 'paragraph', text: 'body' },
    ]);
  });
  test('an empty heading while streaming stays plain text', () => {
    expect(parseAtxHeadings('## ', true)).toEqual([{ type: 'paragraph', text: '## ' }]);
  });
  test('a # without a space is not a heading', () => {
    expect(parseAtxHeadings('#tag', false)).toEqual([{ type: 'paragraph', text: '#tag' }]);
  });
});
