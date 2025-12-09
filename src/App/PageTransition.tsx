import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { pageTransition } from '../lib/animations/presets';

type PageTransitionProps = {
  locationKey: string;
  children: React.ReactNode;
};

const PageTransition: React.FC<PageTransitionProps> = ({ locationKey, children }) => {
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <motion.div
        key={locationKey}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;

