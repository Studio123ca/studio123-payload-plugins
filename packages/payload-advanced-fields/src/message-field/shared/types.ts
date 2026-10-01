export const MESSAGE_TONES = ['info', 'success', 'warning', 'error'] as const;

export type MessageTone = (typeof MESSAGE_TONES)[number];
