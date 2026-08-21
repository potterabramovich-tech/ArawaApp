import type { ImageEffectProcessor } from '../types';

// Jest and unsupported targets resolve this module. Native Metro builds use the
// .native implementation and web deliberately keeps the existing overlay fallback.
export const platformStillImageProcessor: ImageEffectProcessor | null = null;
