import type { ILocalDataReset } from '@/src/core/ports';

export class ResetAllLocalDataUseCase {
  constructor(private readonly localDataReset: ILocalDataReset) {}

  async execute(): Promise<void> {
    await this.localDataReset.resetAllLocalData();
  }
}
