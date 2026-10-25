'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, BookOpen } from 'lucide-react';
import { demosForAudience, type DemoAudience } from './demo-catalog';
import './product-demos.css';

/** Public, local media only. Videos load on demand and never autoplay. */
export function ProductDemos({
  audience = 'all',
}: {
  audience?: DemoAudience;
}) {
  const demos = demosForAudience(audience);
  const [selectedId, setSelectedId] = useState<string>(demos[0].id);
  const [failedId, setFailedId] = useState<string | null>(null);
  const headingId = useId();
  const selected = demos.find((demo) => demo.id === selectedId) ?? demos[0];

  useEffect(() => {
    const followHash = () => {
      const id = window.location.hash.replace('#demo-', '');
      if (demosForAudience(audience).some((demo) => demo.id === id))
        setSelectedId(id);
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, [audience]);

  useEffect(() => {
    if (window.location.hash !== `#demo-${selected.id}`) return;
    const frame = window.requestAnimationFrame(() =>
      document
        .getElementById(`demo-${selected.id}`)
        ?.scrollIntoView?.({ block: 'start' })
    );
    return () => window.cancelAnimationFrame(frame);
  }, [selected.id]);

  const signupRole = audience === 'all' ? selected.audience : audience;
  return (
    <section
      id='watch-demo'
      className='product-demos'
      data-theme='mint-editorial'
      aria-labelledby={headingId}
    >
      <div className='product-demos__inner'>
        <header className='product-demos__heading'>
          <p className='product-demos__eyebrow'>A closer look</p>
          <h2 id={headingId}>See what your next step looks like.</h2>
          <p>
            Short tours of Mintenance, with captions you can follow without
            sound. Choose a feature to explore.
          </p>
        </header>
        <div className='product-demos__layout'>
          <div>
            <div
              className='product-demos__choices'
              role='group'
              aria-label='Choose a product demo'
            >
              {demos.map((demo) => (
                <button
                  key={demo.id}
                  type='button'
                  aria-pressed={selected.id === demo.id}
                  onClick={() => {
                    setSelectedId(demo.id);
                    setFailedId(null);
                    window.history.replaceState(
                      window.history.state,
                      '',
                      `#demo-${demo.id}`
                    );
                  }}
                >
                  <span className='product-demos__play'>
                    <Play size={18} aria-hidden='true' />
                  </span>
                  <span>
                    <small>
                      {demo.label} · {demo.duration}
                    </small>
                    <strong>{demo.title}</strong>
                  </span>
                  <ArrowRight size={18} aria-hidden='true' />
                </button>
              ))}
            </div>
            <div className='product-demos__explanation' aria-live='polite'>
              <h3>{selected.title}</h3>
              <p>{selected.description}</p>
              <ol>
                {selected.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className='product-demos__links'>
                {selected.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label} <ArrowRight size={15} aria-hidden='true' />
                  </Link>
                ))}
              </div>
            </div>
            <div className='product-demos__signup'>
              {signupRole !== 'contractor' && (
                <Link
                  className='product-demos__primary'
                  href='/register?role=homeowner'
                >
                  Get started as a homeowner{' '}
                  <ArrowRight size={17} aria-hidden='true' />
                </Link>
              )}
              {signupRole !== 'homeowner' && (
                <Link
                  className='product-demos__primary'
                  href='/register?role=contractor'
                >
                  Join as a contractor{' '}
                  <ArrowRight size={17} aria-hidden='true' />
                </Link>
              )}
            </div>
          </div>
          <figure className='product-demos__viewer' id={`demo-${selected.id}`}>
            <video
              key={selected.id}
              controls
              playsInline
              preload='none'
              width={720}
              height={1280}
              poster={`/media/demos/${selected.file}-cover.jpg`}
              aria-label={`${selected.title} Captioned product demo`}
              onError={() => setFailedId(selected.id)}
            >
              <source
                src={`/media/demos/${selected.file}.mp4`}
                type='video/mp4'
                onError={() => setFailedId(selected.id)}
              />
              <track
                kind='captions'
                src={`/media/demos/${selected.file}.vtt`}
                srcLang='en'
                label='English'
              />
              Your browser cannot play this video. Read the walkthrough below.
            </video>
            {failedId === selected.id && (
              <p role='status'>
                The video could not load. You can still read the walkthrough
                below or{' '}
                <a href={`/media/demos/${selected.file}.mp4`}>
                  open the video directly
                </a>
                .
              </p>
            )}
            <figcaption>
              Edited app demonstrations with fictional details. Map locations
              are illustrative. Screens may vary between web and mobile.
            </figcaption>
            <details>
              <summary>
                <BookOpen size={16} aria-hidden='true' /> Read the walkthrough
              </summary>
              <p>{selected.description}</p>
              <ol>
                {selected.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>
                To get started, choose the account type that matches you. The
                video closes with an invitation to contact Mintenance.
              </p>
            </details>
          </figure>
        </div>
      </div>
    </section>
  );
}
