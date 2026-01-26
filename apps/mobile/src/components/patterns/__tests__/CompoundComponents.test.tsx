import { Modal, Accordion, Tabs } from '../CompoundComponents';

describe('CompoundComponents', () => {
  it('exports compound components', () => {
    expect(Modal).toBeDefined();
    expect(Accordion).toBeDefined();
    expect(Tabs).toBeDefined();
  });
});
