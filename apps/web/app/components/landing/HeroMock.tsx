'use client';

import {
  ArrowUpRight,
  Check,
  House,
  ImageIcon,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import styles from './HeroMock.module.css';

/** Illustrative product preview, deliberately distinct from a live account. */
export function HeroMock() {
  return (
    <div
      className={styles.stage}
      aria-label='Illustration of a home maintenance project'
    >
      <div className={styles.overline}>
        <span className={styles.dot} /> A little less to worry about.
      </div>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <span className={styles.brand}>
            <House size={20} aria-hidden='true' /> Your home, organised
          </span>
          <span className={styles.example}>Product preview</span>
        </header>
        <div className={styles.body}>
          <div className={styles.intro}>
            <div>
              <span className={styles.eyebrow}>ONE PLACE. EVERY REPAIR.</span>
              <h2>
                From to-do
                <br />
                to taken care of.
              </h2>
            </div>
            <div className={styles.houseMark} aria-hidden='true'>
              <House strokeWidth={1.1} />
            </div>
          </div>
          <div className={styles.project}>
            <div className={styles.projectTop}>
              <span className={styles.tradeIcon}>
                <Wrench size={20} aria-hidden='true' />
              </span>
              <div>
                <span className={styles.eyebrow}>KITCHEN · PLUMBING</span>
                <h3>Fix the leaking tap</h3>
              </div>
              <span className={styles.status}>
                <Check size={13} aria-hidden='true' /> Quote agreed
              </span>
            </div>
            <div className={styles.scope}>
              A clear scope. An agreed price. Everything in writing.
            </div>
            <div className={styles.projectFooter}>
              <span>
                <ImageIcon size={15} aria-hidden='true' /> Photos &amp; job
                details
              </span>
              <span>
                View project <ArrowUpRight size={15} aria-hidden='true' />
              </span>
            </div>
          </div>
          <ol className={styles.steps} aria-label='Example project progress'>
            <li className={styles.done}>
              <span>
                <Check size={14} aria-hidden='true' />
              </span>
              <div>
                Job posted<small>Tell us what needs fixing</small>
              </div>
            </li>
            <li className={styles.done}>
              <span>
                <Check size={14} aria-hidden='true' />
              </span>
              <div>
                Quote agreed<small>Choose your tradesperson</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                Work completed<small>Review the finished job</small>
              </div>
            </li>
          </ol>
        </div>
        <footer className={styles.footer}>
          <ShieldCheck size={21} aria-hidden='true' />
          <div>
            <strong>You stay in control</strong>
            <span>Review the work before approving payment release.</span>
          </div>
        </footer>
      </div>
      <div className={styles.caption}>
        <span>THE DETAILS, ALL TOGETHER</span>
        <span>Quotes. Messages. Progress.</span>
      </div>
    </div>
  );
}
