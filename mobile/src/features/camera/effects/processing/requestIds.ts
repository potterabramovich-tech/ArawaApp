let requestSequence = 0;

export function createProcessingRequestId(): string {
  requestSequence += 1;
  return `aracam-${Date.now().toString(36)}-${requestSequence.toString(36)}`;
}
