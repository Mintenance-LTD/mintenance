import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePhotoAssessmentTrigger } from '../usePhotoAssessmentTrigger';

describe('photo assessment trigger', () => {
  it('does not re-assess unchanged photos after field edits or callback changes', async () => {
    const assess = vi.fn().mockResolvedValue(null);
    const options = {
      images: ['photo-a'],
      isAssessing: false,
      location: 'London',
      assess,
    };
    const ui = renderHook((p) => usePhotoAssessmentTrigger(p), {
      initialProps: options,
    });
    await waitFor(() => expect(assess).toHaveBeenCalledOnce());
    ui.rerender({ ...options, images: ['photo-a'], location: 'Manchester' });
    expect(assess).toHaveBeenCalledOnce();
    const replacement = vi.fn().mockResolvedValue(null);
    ui.rerender({ ...options, assess: replacement });
    expect(replacement).not.toHaveBeenCalled();
  });

  it('assesses replacements even when the image count is unchanged', async () => {
    const assess = vi.fn().mockResolvedValue(null);
    const options = { images: ['photo-a'], isAssessing: false, assess };
    const ui = renderHook((p) => usePhotoAssessmentTrigger(p), {
      initialProps: options,
    });
    await act(async () => {});
    ui.rerender({ ...options, images: ['photo-b'] });
    await waitFor(() => expect(assess).toHaveBeenCalledTimes(2));
    expect(assess.mock.calls[1][0]).toEqual(['photo-b']);
  });

  it('queues only the latest photo set and context while a request is pending', async () => {
    let finish!: (value: null) => void;
    const assess = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValue(null);
    const options = {
      images: ['photo-a'],
      isAssessing: false,
      location: 'London',
      assess,
    };
    const ui = renderHook((p) => usePhotoAssessmentTrigger(p), {
      initialProps: options,
    });
    ui.rerender({ ...options, images: ['photo-b'], location: 'Bristol' });
    ui.rerender({ ...options, images: ['photo-c'], location: 'York' });
    expect(assess).toHaveBeenCalledOnce();
    await act(async () => {
      finish(null);
    });
    await waitFor(() => expect(assess).toHaveBeenCalledTimes(2));
    expect(assess.mock.calls[1]).toEqual([
      ['photo-c'],
      { location: 'York', propertyType: undefined },
    ]);
  });

  it('does not spin on failures and allows a changed set to be assessed', async () => {
    const assess = vi.fn().mockRejectedValue(new Error('offline'));
    const options = { images: ['photo-a'], isAssessing: false, assess };
    const ui = renderHook((p) => usePhotoAssessmentTrigger(p), {
      initialProps: options,
    });
    await act(async () => {});
    ui.rerender({ ...options, images: ['photo-a'] });
    expect(assess).toHaveBeenCalledOnce();
    ui.rerender({ ...options, images: [] });
    ui.rerender(options);
    await waitFor(() => expect(assess).toHaveBeenCalledTimes(2));
  });

  it('does not start queued work after unmount', async () => {
    let finish!: (value: null) => void;
    const assess = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const options = { images: ['photo-a'], isAssessing: false, assess };
    const ui = renderHook((p) => usePhotoAssessmentTrigger(p), {
      initialProps: options,
    });
    ui.rerender({ ...options, images: ['photo-b'] });
    ui.unmount();
    await act(async () => {
      finish(null);
    });
    expect(assess).toHaveBeenCalledOnce();
  });
});
