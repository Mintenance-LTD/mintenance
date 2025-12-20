"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";

/**
 * MINTENANCE PROFESSIONAL COMPONENT LIBRARY
 *
 * Production-quality components using the Mintenance design system
 * Inspired by Birch & Revealbot's sleek, modern aesthetic
 *
 * Components:
 * 1. Hero - Full-width hero section with gradient background
 * 2. FeatureCard - Service/feature card with icon, title, description
 * 3. StatCard - Metric display card (Revealbot-style)
 * 4. TestimonialCard - Customer testimonial with avatar
 * 5. PricingCard - Pricing tier card
 * 6. CTASection - Call-to-action section with buttons
 * 7. NavBar - Professional navigation with dropdown
 * 8. Footer - Complete footer with links
 * 9. Modal - Professional modal dialog
 * 10. Toast - Notification toast component
 */

/* ============================================
   TYPE DEFINITIONS
   ============================================ */

export interface HeroProps {
  title: string;
  subtitle?: string;
  description: string;
  primaryCTA?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  backgroundImage?: string;
  children?: React.ReactNode;
}

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: {
    text: string;
    href: string;
  };
  variant?: "default" | "elevated" | "subtle";
}

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "gold";
}

export interface TestimonialCardProps {
  quote: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  rating?: number;
  variant?: "default" | "featured";
}

export interface PricingTier {
  name: string;
  price: number;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: {
    text: string;
    href: string;
    onClick?: () => void;
  };
}

export interface PricingCardProps extends PricingTier {}

export interface CTASectionProps {
  title: string;
  description: string;
  primaryCTA: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  variant?: "default" | "gradient" | "mesh";
}

export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
}

export interface NavBarProps {
  logo?: React.ReactNode;
  links: NavLink[];
  cta?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  transparent?: boolean;
}

export interface FooterProps {
  logo?: React.ReactNode;
  tagline?: string;
  sections: {
    title: string;
    links: {
      label: string;
      href: string;
    }[];
  }[];
  social?: {
    platform: string;
    href: string;
    icon: React.ReactNode;
  }[];
  copyright?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
}

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

/* ============================================
   1. HERO COMPONENT
   ============================================ */

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  description,
  primaryCTA,
  secondaryCTA,
  backgroundImage,
  children,
}) => {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero opacity-95" />
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 section-padding-lg">
        <div className="mx-auto max-w-4xl text-center">
          {subtitle && (
            <div className="mb-6 animate-fade-in">
              <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-caption text-white backdrop-blur-sm">
                {subtitle}
              </span>
            </div>
          )}

          <h1 className="text-display-lg mb-8 text-white animate-slide-up">
            {title}
          </h1>

          <p className="text-body-lg mb-12 text-white/90 animate-slide-up stagger-1">
            {description}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-2">
            {primaryCTA && (
              <Link
                href={primaryCTA.href}
                onClick={primaryCTA.onClick}
                className="btn btn-gold btn-lg shadow-gold"
              >
                {primaryCTA.text}
              </Link>
            )}
            {secondaryCTA && (
              <Link
                href={secondaryCTA.href}
                onClick={secondaryCTA.onClick}
                className="btn btn-ghost btn-lg bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                {secondaryCTA.text}
              </Link>
            )}
          </div>

          {children && (
            <div className="mt-16 animate-fade-in stagger-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ============================================
   2. FEATURE CARD COMPONENT
   ============================================ */

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  link,
  variant = "default",
}) => {
  const cardClasses = {
    default: "card hover-lift",
    elevated: "card-elevated hover-lift",
    subtle: "card-subtle hover-lift",
  };

  return (
    <div className={cardClasses[variant]}>
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-mint-100 to-mint-200 text-mint-700 transition-transform hover:scale-110">
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-h3 mb-3">{title}</h3>
      <p className="text-body mb-6">{description}</p>

      {/* Link */}
      {link && (
        <Link
          href={link.href}
          className="inline-flex items-center gap-2 text-navy-800 font-medium hover:gap-3 transition-all"
        >
          {link.text}
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      )}
    </div>
  );
};

/* ============================================
   3. STAT CARD COMPONENT (Revealbot-style)
   ============================================ */

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  variant = "default",
}) => {
  const variantStyles = {
    default: "bg-white border-gray-200",
    primary: "gradient-primary text-white",
    secondary: "gradient-secondary text-white",
    gold: "gradient-gold text-white",
  };

  const isColorVariant = variant !== "default";

  return (
    <div
      className={`
        rounded-2xl border p-6 shadow-base hover:shadow-lg transition-all hover-lift
        ${variantStyles[variant]}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <p
          className={`text-body-sm font-medium ${
            isColorVariant ? "text-white/80" : "text-gray-600"
          }`}
        >
          {label}
        </p>
        {icon && (
          <div className={isColorVariant ? "text-white/60" : "text-gray-400"}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className={`text-display-sm ${isColorVariant ? "text-white" : "text-gray-900"}`}>
            {value}
          </p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              {change.trend === "up" && (
                <svg
                  className="h-4 w-4 text-success"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L9 11.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0L11 10.586 14.586 7H13a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {change.trend === "down" && (
                <svg
                  className="h-4 w-4 text-error"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 13a1 1 0 001 1h4a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L9 8.586 5.707 5.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0L11 9.414 14.586 13H13a1 1 0 00-1 1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span
                className={`text-body-sm font-medium ${
                  change.trend === "up"
                    ? "text-success"
                    : change.trend === "down"
                    ? "text-error"
                    : isColorVariant
                    ? "text-white/60"
                    : "text-gray-500"
                }`}
              >
                {change.value > 0 ? "+" : ""}
                {change.value}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================
   4. TESTIMONIAL CARD COMPONENT
   ============================================ */

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  rating = 5,
  variant = "default",
}) => {
  const cardClass = variant === "featured" ? "card-elevated" : "card";

  return (
    <div className={`${cardClass} hover-lift`}>
      {/* Rating */}
      <div className="mb-6 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`h-5 w-5 ${
              i < rating ? "text-gold-500" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-body-lg mb-6 text-gray-700 italic">
        "{quote}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4">
        {author.avatar ? (
          <img
            src={author.avatar}
            alt={author.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-mint-400 to-mint-600 text-white font-semibold">
            {author.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
        )}
        <div>
          <p className="text-h4 text-gray-900">{author.name}</p>
          <p className="text-body-sm text-gray-500">{author.role}</p>
        </div>
      </div>
    </div>
  );
};

/* ============================================
   5. PRICING CARD COMPONENT
   ============================================ */

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period = "month",
  description,
  features,
  highlighted = false,
  cta,
}) => {
  return (
    <div
      className={`
        relative rounded-2xl p-8 transition-all hover-lift
        ${
          highlighted
            ? "bg-gradient-to-br from-navy-800 to-navy-900 text-white shadow-xl border-2 border-mint-500"
            : "bg-white border border-gray-200 shadow-base"
        }
      `}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="badge badge-success px-4 py-1.5">Most Popular</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h3
          className={`text-h2 mb-2 ${highlighted ? "text-white" : "text-gray-900"}`}
        >
          {name}
        </h3>
        <p
          className={`text-body ${
            highlighted ? "text-white/80" : "text-gray-600"
          }`}
        >
          {description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-8 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span
            className={`text-display-md ${highlighted ? "text-white" : "text-gray-900"}`}
          >
            £{price}
          </span>
          <span
            className={`text-body ${
              highlighted ? "text-white/60" : "text-gray-500"
            }`}
          >
            /{period}
          </span>
        </div>
      </div>

      {/* Features */}
      <ul className="mb-8 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <svg
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                highlighted ? "text-mint-400" : "text-mint-600"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span
              className={`text-body ${
                highlighted ? "text-white/90" : "text-gray-700"
              }`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={cta.href}
        onClick={cta.onClick}
        className={`btn btn-lg w-full ${
          highlighted ? "btn-gold" : "btn-primary"
        }`}
      >
        {cta.text}
      </Link>
    </div>
  );
};

/* ============================================
   6. CTA SECTION COMPONENT
   ============================================ */

export const CTASection: React.FC<CTASectionProps> = ({
  title,
  description,
  primaryCTA,
  secondaryCTA,
  variant = "default",
}) => {
  const variantClasses = {
    default: "bg-white",
    gradient: "gradient-hero",
    mesh: "gradient-mesh",
  };

  const isLight = variant === "default" || variant === "mesh";

  return (
    <section className={`${variantClasses[variant]} section-padding`}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2
          className={`text-display-md mb-6 ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          {title}
        </h2>
        <p
          className={`text-body-lg mb-10 ${
            isLight ? "text-gray-600" : "text-white/90"
          }`}
        >
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {primaryCTA.href ? (
            <Link
              href={primaryCTA.href}
              onClick={primaryCTA.onClick}
              className={`btn btn-lg ${isLight ? "btn-primary" : "btn-gold"}`}
            >
              {primaryCTA.text}
            </Link>
          ) : (
            <button
              onClick={primaryCTA.onClick}
              className={`btn btn-lg ${isLight ? "btn-primary" : "btn-gold"}`}
            >
              {primaryCTA.text}
            </button>
          )}
          {secondaryCTA && (
            secondaryCTA.href ? (
              <Link
                href={secondaryCTA.href}
                onClick={secondaryCTA.onClick}
                className={`btn btn-lg ${
                  isLight
                    ? "btn-ghost"
                    : "btn-ghost bg-white/10 text-white border-white/30 hover:bg-white/20"
                }`}
              >
                {secondaryCTA.text}
              </Link>
            ) : (
              <button
                onClick={secondaryCTA.onClick}
                className={`btn btn-lg ${
                  isLight
                    ? "btn-ghost"
                    : "btn-ghost bg-white/10 text-white border-white/30 hover:bg-white/20"
                }`}
              >
                {secondaryCTA.text}
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
};

/* ============================================
   7. NAVBAR COMPONENT
   ============================================ */

export const NavBar: React.FC<NavBarProps> = ({
  logo,
  links,
  cta,
  transparent = false,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = transparent
    ? isScrolled
      ? "bg-white/95 backdrop-blur-md shadow-sm"
      : "bg-transparent"
    : "bg-white shadow-sm";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${navClass}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logo || (
              <span
                className={`text-h3 font-bold ${
                  transparent && !isScrolled ? "text-white" : "text-navy-800"
                }`}
              >
                Mintenance
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {links.map((link) => (
              <div key={link.label} className="relative group">
                {link.children ? (
                  <>
                    <button
                      className={`flex items-center gap-1 text-body font-medium transition-colors ${
                        transparent && !isScrolled
                          ? "text-white/90 hover:text-white"
                          : "text-gray-700 hover:text-navy-800"
                      }`}
                      onMouseEnter={() => setOpenDropdown(link.label)}
                    >
                      {link.label}
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {/* Dropdown */}
                    <div
                      className="absolute left-0 top-full mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                        {link.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            className="block px-4 py-2 text-body text-gray-700 hover:bg-gray-50 hover:text-navy-800 transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className={`text-body font-medium transition-colors ${
                      transparent && !isScrolled
                        ? "text-white/90 hover:text-white"
                        : "text-gray-700 hover:text-navy-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            {cta && (
              <Link
                href={cta.href}
                onClick={cta.onClick}
                className="hidden md:inline-flex btn btn-primary"
              >
                {cta.text}
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg ${
                transparent && !isScrolled ? "text-white" : "text-gray-700"
              }`}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <div key={link.label}>
                  {link.children ? (
                    <>
                      <button
                        onClick={() =>
                          setOpenDropdown(openDropdown === link.label ? null : link.label)
                        }
                        className="w-full text-left px-4 py-2 text-body text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between"
                      >
                        {link.label}
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            openDropdown === link.label ? "rotate-180" : ""
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {openDropdown === link.label && (
                        <div className="pl-4 flex flex-col gap-1">
                          {link.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="px-4 py-2 text-body text-gray-600 hover:bg-gray-50 rounded-lg"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className="block px-4 py-2 text-body text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
              {cta && (
                <Link
                  href={cta.href}
                  onClick={cta.onClick}
                  className="btn btn-primary mt-2"
                >
                  {cta.text}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

/* ============================================
   8. FOOTER COMPONENT
   ============================================ */

export const Footer: React.FC<FooterProps> = ({
  logo,
  tagline,
  sections,
  social,
  copyright,
}) => {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            {logo || (
              <span className="text-h2 font-bold text-white">Mintenance</span>
            )}
            {tagline && (
              <p className="mt-4 text-body text-white/80 max-w-sm">{tagline}</p>
            )}
            {/* Social */}
            {social && (
              <div className="mt-6 flex gap-4">
                {social.map((item) => (
                  <a
                    key={item.platform}
                    href={item.href}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    aria-label={item.platform}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          {sections.map((section, index) => (
            <div key={section.title} className="lg:col-span-2">
              <h3 className="text-h4 mb-4 text-white">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-body-sm text-white/60 text-center">
            {copyright || `© ${new Date().getFullYear()} Mintenance. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
};

/* ============================================
   9. MODAL COMPONENT
   ============================================ */

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} animate-scale-in`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 id="modal-title" className="text-h2">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus-ring"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

/* ============================================
   10. TOAST COMPONENT
   ============================================ */

// Toast Context for managing toasts
interface Toast extends ToastProps {
  id: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<ToastProps, "onClose">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<ToastProps, "onClose">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onClose: (id: string) => void }> = ({
  toasts,
  onClose,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full px-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
};

export const Toast: React.FC<ToastProps & { id?: string }> = ({
  message,
  type = "info",
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 200);
  };

  const typeStyles = {
    success: {
      bg: "bg-success-light border-success",
      text: "text-success-dark",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    error: {
      bg: "bg-error-light border-error",
      text: "text-error-dark",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    warning: {
      bg: "bg-warning-light border-warning",
      text: "text-warning-dark",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    info: {
      bg: "bg-info-light border-info",
      text: "text-info-dark",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const style = typeStyles[type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        ${style.bg} ${style.text}
        ${isExiting ? "animate-fade-out" : "animate-slide-up"}
        transition-all
      `}
      role="alert"
    >
      <div className="flex-shrink-0">{style.icon}</div>
      <p className="flex-1 text-body font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="Close notification"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

/* ============================================
   EXPORT ALL COMPONENTS
   ============================================ */

export default {
  Hero,
  FeatureCard,
  StatCard,
  TestimonialCard,
  PricingCard,
  CTASection,
  NavBar,
  Footer,
  Modal,
  Toast,
  ToastProvider,
  useToast,
};
