'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function LampContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const BG = '#0F172A'

  return (
    <div
      className={cn(
        'relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden w-full z-0',
        className
      )}
      style={{ background: BG }}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">

        {/* Left conic beam */}
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible"
          style={{ backgroundImage: 'conic-gradient(from 70deg at center top, #6366F1, transparent, transparent)' }}
        >
          <div className="absolute w-full left-0 h-40 bottom-0 z-20"
            style={{ background: BG, maskImage: 'linear-gradient(to top, white, transparent)', WebkitMaskImage: 'linear-gradient(to top, white, transparent)' }}
          />
          <div className="absolute w-40 h-full left-0 bottom-0 z-20"
            style={{ background: BG, maskImage: 'linear-gradient(to right, white, transparent)', WebkitMaskImage: 'linear-gradient(to right, white, transparent)' }}
          />
        </motion.div>

        {/* Right conic beam */}
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto left-1/2 h-56"
          style={{ backgroundImage: 'conic-gradient(from 290deg at center top, transparent, transparent, #6366F1)' }}
        >
          <div className="absolute w-40 h-full right-0 bottom-0 z-20"
            style={{ background: BG, maskImage: 'linear-gradient(to left, white, transparent)', WebkitMaskImage: 'linear-gradient(to left, white, transparent)' }}
          />
          <div className="absolute w-full right-0 h-40 bottom-0 z-20"
            style={{ background: BG, maskImage: 'linear-gradient(to top, white, transparent)', WebkitMaskImage: 'linear-gradient(to top, white, transparent)' }}
          />
        </motion.div>

        {/* Background blur cover */}
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 blur-2xl" style={{ background: BG }} />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />

        {/* Glow orb */}
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full opacity-50 blur-3xl"
          style={{ background: '#6366F1' }}
        />

        {/* Inner glow pulse */}
        <motion.div
          initial={{ width: '8rem' }}
          whileInView={{ width: '16rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-30 h-36 -translate-y-[6rem] rounded-full blur-2xl"
          style={{ background: '#818CF8' }}
        />

        {/* Beam line */}
        <motion.div
          initial={{ width: '15rem' }}
          whileInView={{ width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-50 h-0.5 -translate-y-[7rem]"
          style={{ background: 'linear-gradient(90deg, transparent, #818CF8, transparent)' }}
        />

        {/* Cover */}
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem]" style={{ background: BG }} />
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>
    </div>
  )
}
