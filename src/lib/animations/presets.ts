import { Variants } from 'framer-motion';
import { ANIMATION_DURATION, ANIMATION_EASING, SPRING_CONFIG } from './constants';

export const pageTransition: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.standard,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.standard,
    },
  },
};

export const modalTransition: Variants = {
  initial: { opacity: 0, x: '100%' },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.standard,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.standard,
    },
  },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: ANIMATION_EASING.standard,
    },
  },
};

export const hoverCard = {
  whileHover: { scale: 1.02, y: -2, transition: SPRING_CONFIG.bouncy },
  whileTap: { scale: 0.98, transition: SPRING_CONFIG.default },
} as const;

