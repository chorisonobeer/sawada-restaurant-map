export const ANIMATION_DURATION = {
  fast: 0.2, // hover, tap, micro interaction
  normal: 0.3, // page transitions, modals
  slow: 0.5, // complex transitions
  verySlow: 1.0, // hero, prominent visuals
} as const;

export const ANIMATION_EASING = {
  standard: [0.4, 0, 0.2, 1],
  natural: [0.25, 0.1, 0.25, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  smooth: [0.4, 0, 0.2, 1],
} as const;

export const SPRING_CONFIG = {
  default: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
  smooth: {
    type: 'spring',
    stiffness: 200,
    damping: 30,
  },
} as const;

