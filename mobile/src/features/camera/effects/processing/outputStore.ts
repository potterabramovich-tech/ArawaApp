import type { ImageProcessingResult } from './types';

export interface DerivativeFileRemover {
  remove(uri: string): Promise<void>;
}

interface OwnedDerivative {
  references: number;
  cleanupPending: boolean;
  remover: DerivativeFileRemover;
}

export class ProcessingOutputStore {
  private readonly derivatives = new Map<string, OwnedDerivative>();

  register(
    result: Readonly<ImageProcessingResult>,
    remover: DerivativeFileRemover,
  ): boolean {
    if (result.kind !== 'derivative' || result.media.uri === result.sourceUri) {
      return false;
    }

    const owned = this.derivatives.get(result.media.uri);
    if (owned) {
      owned.references += 1;
      owned.cleanupPending = false;
    } else {
      this.derivatives.set(result.media.uri, { cleanupPending: false, references: 1, remover });
    }
    return true;
  }

  owns(uri: string): boolean {
    return this.derivatives.has(uri);
  }

  referenceCount(uri: string): number {
    return this.derivatives.get(uri)?.references ?? 0;
  }

  async release(uri: string): Promise<boolean> {
    const owned = this.derivatives.get(uri);
    if (!owned) {
      return false;
    }
    if (owned.references > 1) {
      owned.references -= 1;
      return false;
    }

    this.derivatives.delete(uri);
    try {
      owned.cleanupPending = true;
      await owned.remover.remove(uri);
      return true;
    } catch (error) {
      this.derivatives.set(uri, owned);
      throw error;
    }
  }


  async retryFailed(): Promise<void> {
    let firstError: unknown;
    for (const [uri, owned] of [...this.derivatives]) {
      if (!owned.cleanupPending) {
        continue;
      }
      try {
        await this.release(uri);
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) {
      throw firstError;
    }
  }
  async releaseAll(): Promise<void> {
    let firstError: unknown;
    for (const [uri, owned] of [...this.derivatives]) {
      owned.references = 1;
      try {
        await this.release(uri);
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) {
      throw firstError;
    }
  }
}

export const processingOutputStore = new ProcessingOutputStore();
