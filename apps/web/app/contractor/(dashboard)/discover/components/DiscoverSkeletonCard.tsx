export function DiscoverSkeletonCard() {
  return (
    <div
      data-theme='mint-editorial'
      className='rounded-xl overflow-hidden animate-pulse'
      style={{
        background: 'var(--me-surface)',
        border: '1px solid var(--me-line-2)',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <div className='h-48' style={{ background: 'var(--me-bg-3)' }} />
      <div className='p-4 space-y-3'>
        <div className='flex items-start justify-between gap-2'>
          <div
            className='h-4 rounded w-2/3'
            style={{ background: 'var(--me-bg-3)' }}
          />
          <div
            className='w-11 h-11 rounded-full flex-shrink-0'
            style={{ background: 'var(--me-bg-3)' }}
          />
        </div>
        <div
          className='h-3 rounded w-1/3'
          style={{ background: 'var(--me-bg-3)' }}
        />
        <div className='space-y-1.5'>
          <div
            className='h-3 rounded'
            style={{ background: 'var(--me-bg-3)' }}
          />
          <div
            className='h-3 rounded w-4/5'
            style={{ background: 'var(--me-bg-3)' }}
          />
        </div>
        <div className='flex items-center justify-between pt-1'>
          <div
            className='h-4 rounded w-24'
            style={{ background: 'var(--me-bg-3)' }}
          />
          <div
            className='h-5 rounded-full w-16'
            style={{ background: 'var(--me-bg-3)' }}
          />
        </div>
        <div className='flex gap-2 pt-1'>
          <div
            className='h-8 rounded-lg flex-1'
            style={{ background: 'var(--me-bg-3)' }}
          />
          <div
            className='h-8 rounded-lg w-9 flex-shrink-0'
            style={{ background: 'var(--me-bg-3)' }}
          />
          <div
            className='h-8 rounded-lg w-9 flex-shrink-0'
            style={{ background: 'var(--me-bg-3)' }}
          />
        </div>
      </div>
    </div>
  );
}
