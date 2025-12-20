/**
 * MotionDiv - Accessibility-aware motion wrapper
 * WCAG 2.1 Level AA Compliant
 *
 * Automatically respects user's reduced motion preferences.
 * Drop-in replacement for motion.div that disables animations when needed.
 *
 * @example
 * ```typescript
 * // Before (not accessible):
 * <motion.div variants={fadeIn} initial="initial" animate="animate">
 *   Content
 * </motion.div>
 *
 * // After (accessible):
 * <MotionDiv variants={fadeIn} initial="initial" animate="animate">
 *   Content
 * </MotionDiv>
 * ```
 */

'use client';

import React from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Extract ref from MotionProps to avoid conflicts
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

// Helper to filter out Framer Motion-specific props for regular HTML elements
function filterMotionProps(props: Record<string, any>): Record<string, any> {
  const motionPropKeys = [
    'variants', 'initial', 'animate', 'exit', 'whileHover', 'whileTap', 'whileFocus',
    'whileInView', 'transition', 'onDrag', 'onDragStart', 'onDragEnd', 'onPan',
    'onPanStart', 'onPanEnd', 'onPanSessionStart', 'onPanSessionEnd', 'layout',
    'layoutId', 'layoutDependency', 'layoutRoot', 'drag', 'dragConstraints',
    'dragElastic', 'dragMomentum', 'dragTransition', 'dragPropagation',
    'dragDirectionLock', 'dragSnapToOrigin', 'dragListener', 'onAnimationStart',
    'onAnimationComplete', 'onUpdate', 'onLayoutAnimationStart', 'onLayoutAnimationComplete',
    'onViewportEnter', 'onViewportLeave', 'viewport', 'custom', 'inherit',
  ];
  
  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!motionPropKeys.includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export function MotionDiv({
  children,
  variants,
  initial,
  animate,
  exit,
  whileHover,
  whileTap,
  whileFocus,
  whileInView,
  transition,
  className,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...props
}: MotionDivProps) {
  const prefersReducedMotion = useReducedMotion();

  // If user prefers reduced motion, render as static div
  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <div
        className={className}
        style={style}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...filteredProps}
      >
        {children}
      </div>
    );
  }

  // Otherwise, render with full animations
  return (
    <motion.div
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      whileHover={whileHover}
      whileTap={whileTap}
      whileFocus={whileFocus}
      whileInView={whileInView}
      transition={transition}
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * MotionSection - Accessible motion wrapper for section elements
 */
export function MotionSection({
  children,
  variants,
  initial,
  animate,
  exit,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <section className={className} {...filteredProps}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  );
}

/**
 * MotionButton - Accessible motion wrapper for button elements
 */
export function MotionButton({
  children,
  variants,
  initial,
  animate,
  whileHover,
  whileTap,
  className,
  onClick,
  disabled,
  type = 'button',
  ...props
}: Omit<MotionDivProps, 'as' | 'onClick'> & {
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <button
        type={type}
        className={className}
        onClick={onClick}
        disabled={disabled}
        {...filteredProps}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type={type}
      variants={variants}
      initial={initial}
      animate={animate}
      whileHover={whileHover}
      whileTap={whileTap}
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

/**
 * MotionArticle - Accessible motion wrapper for article elements
 */
export function MotionArticle({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <article className={className} {...filteredProps}>
        {children}
      </article>
    );
  }

  return (
    <motion.article
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.article>
  );
}

/**
 * MotionLi - Accessible motion wrapper for list item elements
 * Useful for stagger animations in lists
 */
export function MotionLi({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <li className={className} {...filteredProps}>
        {children}
      </li>
    );
  }

  return (
    <motion.li
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.li>
  );
}

/**
 * MotionP - Accessible motion wrapper for paragraph elements
 */
export function MotionP({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <p className={className} {...filteredProps}>
        {children}
      </p>
    );
  }

  return (
    <motion.p
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.p>
  );
}

/**
 * MotionH1 - Accessible motion wrapper for h1 heading elements
 */
export function MotionH1({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <h1 className={className} {...filteredProps}>
        {children}
      </h1>
    );
  }

  return (
    <motion.h1
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.h1>
  );
}

/**
 * MotionH2 - Accessible motion wrapper for h2 heading elements
 */
export function MotionH2({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <h2 className={className} {...filteredProps}>
        {children}
      </h2>
    );
  }

  return (
    <motion.h2
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.h2>
  );
}

/**
 * MotionH3 - Accessible motion wrapper for h3 heading elements
 */
export function MotionH3({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <h3 className={className} {...filteredProps}>
        {children}
      </h3>
    );
  }

  return (
    <motion.h3
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.h3>
  );
}

/**
 * MotionH4 - Accessible motion wrapper for h4 heading elements
 */
export function MotionH4({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <h4 className={className} {...filteredProps}>
        {children}
      </h4>
    );
  }

  return (
    <motion.h4
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.h4>
  );
}

/**
 * MotionH5 - Accessible motion wrapper for h5 heading elements
 */
export function MotionH5({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <h5 className={className} {...filteredProps}>
        {children}
      </h5>
    );
  }

  return (
    <motion.h5
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.h5>
  );
}

/**
 * MotionH6 - Accessible motion wrapper for h6 heading elements
 */
export function MotionH6({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <h6 className={className} {...filteredProps}>
        {children}
      </h6>
    );
  }

  return (
    <motion.h6
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.h6>
  );
}

/**
 * MotionUl - Accessible motion wrapper for unordered list elements
 */
export function MotionUl({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <ul className={className} {...filteredProps}>
        {children}
      </ul>
    );
  }

  return (
    <motion.ul
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.ul>
  );
}

/**
 * MotionNav - Accessible motion wrapper for nav elements
 */
export function MotionNav({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <nav className={className} {...filteredProps}>
        {children}
      </nav>
    );
  }

  return (
    <motion.nav
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.nav>
  );
}

/**
 * MotionAside - Accessible motion wrapper for aside elements
 */
export function MotionAside({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <aside className={className} {...filteredProps}>
        {children}
      </aside>
    );
  }

  return (
    <motion.aside
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.aside>
  );
}

/**
 * MotionHeader - Accessible motion wrapper for header elements
 */
export function MotionHeader({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <header className={className} {...filteredProps}>
        {children}
      </header>
    );
  }

  return (
    <motion.header
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.header>
  );
}

/**
 * MotionFooter - Accessible motion wrapper for footer elements
 */
export function MotionFooter({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <footer className={className} {...filteredProps}>
        {children}
      </footer>
    );
  }

  return (
    <motion.footer
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.footer>
  );
}

/**
 * MotionMain - Accessible motion wrapper for main elements
 */
export function MotionMain({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <main className={className} {...filteredProps}>
        {children}
      </main>
    );
  }

  return (
    <motion.main
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.main>
  );
}

/**
 * MotionSpan - Accessible motion wrapper for span elements
 */
export function MotionSpan({
  children,
  variants,
  initial,
  animate,
  className,
  ...props
}: Omit<MotionDivProps, 'as'>) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <span className={className} {...filteredProps}>
        {children}
      </span>
    );
  }

  return (
    <motion.span
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      {...props}
    >
      {children}
    </motion.span>
  );
}

/**
 * MotionImg - Accessible motion wrapper for img elements
 */
export function MotionImg({
  src,
  alt,
  variants,
  initial,
  animate,
  className,
  width,
  height,
  ...props
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
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        {...filteredProps}
      />
    );
  }

  return (
    <motion.img
      src={src}
      alt={alt}
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      width={width}
      height={height}
      {...props}
    />
  );
}

/**
 * MotionSvg - Accessible motion wrapper for svg elements
 */
export function MotionSvg({
  children,
  variants,
  initial,
  animate,
  className,
  viewBox,
  xmlns,
  fill,
  stroke,
  strokeWidth,
  ...props
}: MotionDivProps & {
  viewBox?: string;
  xmlns?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  width?: number | string;
  height?: number | string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <svg
        className={className}
        viewBox={viewBox}
        xmlns={xmlns}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        {...filteredProps}
      >
        {children}
      </svg>
    );
  }

  return (
    <motion.svg
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      viewBox={viewBox}
      xmlns={xmlns}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      {...(props as any)}
    >
      {children}
    </motion.svg>
  );
}

/**
 * MotionPath - Accessible motion wrapper for SVG path elements
 */
export function MotionPath({
  d,
  variants,
  initial,
  animate,
  className,
  fill,
  stroke,
  strokeWidth,
  strokeLinecap,
  strokeLinejoin,
  ...props
}: Omit<MotionDivProps, 'children'> & {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <path
        d={d}
        className={className}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
        {...filteredProps}
      />
    );
  }

  return (
    <motion.path
      d={d}
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      {...(props as any)}
    />
  );
}

/**
 * MotionCircle - Accessible motion wrapper for SVG circle elements
 */
export function MotionCircle({
  variants,
  initial,
  animate,
  className,
  cx,
  cy,
  r,
  fill,
  stroke,
  strokeWidth,
  ...props
}: Omit<MotionDivProps, 'children'> & {
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <circle
        className={className}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        {...filteredProps}
      />
    );
  }

  return (
    <motion.circle
      variants={variants}
      initial={initial}
      animate={animate}
      className={className}
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      {...(props as any)}
    />
  );
}

/**
 * MotionA - Accessible motion wrapper for anchor/link elements
 */
export function MotionA({
  children,
  href,
  variants,
  initial,
  animate,
  whileHover,
  whileTap,
  className,
  target,
  rel,
  ...props
}: MotionDivProps & {
  href: string;
  target?: string;
  rel?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const filteredProps = filterMotionProps(props);
    return (
      <a
        href={href}
        className={className}
        target={target}
        rel={rel}
        {...filteredProps}
      >
        {children}
      </a>
    );
  }

  return (
    <motion.a
      href={href}
      variants={variants}
      initial={initial}
      animate={animate}
      whileHover={whileHover}
      whileTap={whileTap}
      className={className}
      target={target}
      rel={rel}
      {...(props as any)}
    >
      {children}
    </motion.a>
  );
}

// Export all components
export default MotionDiv;
