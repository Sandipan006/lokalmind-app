import * as Haptics from 'expo-haptics';

/** Light tap roughly every 1.5-2 streamed words (alternating 2,1,2,1...). */
export class StreamHaptics {
  private pendingWordFragment = '';
  private wordsSinceLastHaptic = 0;
  private nextWordTriggerCount = 2;

  reset(): void {
    this.pendingWordFragment = '';
    this.wordsSinceLastHaptic = 0;
    this.nextWordTriggerCount = 2;
  }

  onToken(token: string): void {
    const combined = `${this.pendingWordFragment}${token}`;
    const endsWithWhitespace = /\s$/.test(combined);
    const parts = combined.split(/\s+/).filter((part) => part.length > 0);

    if (!endsWithWhitespace && parts.length > 0) {
      this.pendingWordFragment = parts.pop() ?? '';
    } else {
      this.pendingWordFragment = '';
    }

    this.wordsSinceLastHaptic += parts.length;

    while (this.wordsSinceLastHaptic >= this.nextWordTriggerCount) {
      this.wordsSinceLastHaptic -= this.nextWordTriggerCount;
      this.nextWordTriggerCount = this.nextWordTriggerCount === 2 ? 1 : 2;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }
}
