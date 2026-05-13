import React from 'react';
import Navbar from './Navbar';
import { motion } from 'motion/react';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden font-sans">
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <main className="flex-1 px-4 overflow-y-auto w-full custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto w-full pb-10"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
