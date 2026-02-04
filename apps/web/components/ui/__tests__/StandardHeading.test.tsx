import React from 'react';
import { render, screen } from '@testing-library/react';
import StandardHeading, { PageTitle, SectionHeading, SubsectionHeading, CardHeading } from '../StandardHeading';

describe('StandardHeading', () => {
  it('should render h1 for level 1', () => {
    render(<StandardHeading level={1}>Page Title</StandardHeading>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page Title');
  });

  it('should render h2 for level 2', () => {
    render(<StandardHeading level={2}>Section</StandardHeading>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section');
  });

  it('should render h3 for level 3', () => {
    render(<StandardHeading level={3}>Sub</StandardHeading>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Sub');
  });

  it('should override tag with as prop', () => {
    render(<StandardHeading level={1} as="h2">Override</StandardHeading>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Override');
  });
});

describe('PageTitle', () => {
  it('should render as h1', () => {
    render(<PageTitle>Welcome</PageTitle>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome');
  });
});

describe('SectionHeading', () => {
  it('should render as h2', () => {
    render(<SectionHeading>Section</SectionHeading>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section');
  });
});

describe('SubsectionHeading', () => {
  it('should render as h3', () => {
    render(<SubsectionHeading>Subsection</SubsectionHeading>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subsection');
  });
});

describe('CardHeading', () => {
  it('should render as h4', () => {
    render(<CardHeading>Card Title</CardHeading>);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Card Title');
  });
});
