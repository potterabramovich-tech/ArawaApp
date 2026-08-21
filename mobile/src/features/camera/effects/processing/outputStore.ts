import type { ImageProcessingResult } from './types';

export interface DerivativeFileRemover {
  remove(uri: string): Promise<void>;
}

export class ProcessingOutputStore {
  private readonly ownedDerivativeUris = new Set<string>();

  register(result: Readonly<ImageProcessingResult>): void {
    if (result.kind === 'derivative' && result.media.uri !== result.sourceUri) {
      this.ownedDerivativeUris.add(result.media.uri);
    }
  }

  owns(uri: string): boolean {
    return this.ownedDerivativeUris.has(uri);
  }

  async release(uri: string, remover: DerivativeFileRemover): Promise<boolean> {
    if (!this.ownedDerivativeUris.delete(uri)) {
      return false;
    }

    try {
      await remover.remove(uri);
      return true;
    } catch (error) {
      this.ownedDerivativeUris.add(uri);
      throw error;
    }
  }

  async releaseAll(remover: DerivativeFileRemover): Promise<void> {
    for (const uri of [...this.ownedDerivativeUris]) {
      await this.release(uri, remover);
    }
  }
}
