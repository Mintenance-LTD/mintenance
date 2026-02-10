/**
 * MotionDiv - Accessibility-aware motion wrapper
 * WCAG 2.1 Level AA Compliant
 *
 * Automatically respects user's reduced motion preferences.
 * Drop-in replacement for motion.div that disables animations when needed.
 */

'use client';

import React from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type MotionDivProps = Omit<MotionProps, 'ref'> & {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  role?: string;
  id?: string;
  'data-testid'?: string;
  title?: string;
};

const MOTION_PROP_KEYS = new Set([
  'variants', 'initial', 'animate', 'exit', 'whileHover', 'whileTap', 'whileFocus',
  'whileInView', 'transition', 'onDrag', 'onDragStart', 'onDragEnd', 'onPan',
  'onPanStart', 'onPanEnd', 'onPanSessionStart', 'onPanSessionEnd', 'layout',
  'layoutId', 'layoutDependency', 'layoutRoot', 'drag', 'dragConstraints',
  'dragElastic', 'dragMomentum', 'dragTransition', 'dragPropagation',
  'dragDirectionLock', 'dragSnapToOrigin', 'dragListener', 'onAnimationStart',
  'onAnimationComplete', 'onUpdate', 'onLayoutAnimationStart', 'onLayoutAnimationComplete',
  'onViewportEnter', 'onViewportLeave', 'viewport', 'custom', 'inherit',
]);

function filterMotionProps(props: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!MOTION_PROP_KEYS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export function MotionDiv({
  children, variants, initial, animate, exit, whileHover, whileTap, whileFocus,
  whileInView, transition, className, style, onClick, onMouseEnter, onMouseLeave,
  ...props
}: MotionDivProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <div className={className} style={style} onClick={onClick}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...filteredProps}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={variants} initial={initial} animate={animate} exit={exit}
      whileHover={whileHover} whileTap={whileTap} whileFocus={whileFocus}
      whileInView={whileInView} transition={transition}
      className={className} style={style} onClick={onClick}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...props}>
      {children}
    </motion.div>
  );
}

export function MotionSection({
  children, variants, initial, animate, exit, className, ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return <section className={className} {...filteredProps}>{children}</section>;
  }

  return (
    <motion.section variants={variants} initial={initial} animate={animate}
      exit={exit} className={className} {...props}>
      {children}
    </motion.section>
  );
}

export function MotionButton({
  children, variants, initial, animate, whileHover, whileTap, className, onClick,
  disabled, type = 'button', ...props
}: Omit<MotionDivProps, 'as' | 'onClick'> & {
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <button type={type} className={className} onClick={onClick} disabled={disabled}
        {...filteredProps}>
        {children}
      </button>
    );
  }

  return (
    <motion.button type={type} variants={variants} initial={initial} animate={animate}
      whileHover={whileHover} whileTap={whileTap} className={className}
      onClick={onClick} disabled={disabled} {...(props as Record<string, unknown>)}>
      {children}
    </motion.button>
  );
}

export function MotionArticle({
  children, variants, initial, animate, className, ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return <article className={className} {...filteredProps}>{children}</article>;
  }

  return (
    <motion.article variants={variants} initial={initial} animate={animate}
      className={className} {...props}>
      {children}
    </motion.article>
  );
}

export function MotionP({
  children, variants, initial, animate, className, ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return <p className={className} {...filteredProps}>{children}</p>;
  }

  return (
    <motion.p variants={variants} initial={initial} animate={animate}
      className={className} {...props}>
      {children}
    </motion.p>
  );
}

export function MotionH1({
  children, variants, initial, animate, className, ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return <h1 className={className} {...filteredProps}>{children}</h1>;
  }

  return (
    <motion.h1 variants={variants} initial={initial} animate={animate}
      className={className} {...props}>
      {children}
    </motion.h1>
  );
}

export function MotionImg({
  src, alt, variants, initial, animate, className, width, height, ...props
}: Omit<MotionDivProps, 'children'> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} width={width} height={height}
        {...filteredProps} />
    );
  }

  return (
    <motion.img src={src} alt={alt} variants={variants} initial={initial}
      animate={animate} className={className} width={width} height={height}
      {...props} />
  );
}

export function MotionA({
  children, href, variants, initial, animate, whileHover, whileTap, className,
  target, rel, ...props
}: MotionDivProps & {
  href: string;
  target?: string;
  rel?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <a href={href} className={className} target={target} rel={rel}
        {...filteredProps}>
        {children}
      </a>
    );
  }

  return (
    <motion.a href={href} variants={variants} initial={initial} animate={animate}
      whileHover={whileHover} whileTap={whileTap} className={className}
      target={target} rel={rel} {...(props as Record<string, unknown>)}>
      {children}
    </motion.a>
  );
}

export default MotionDiv;
