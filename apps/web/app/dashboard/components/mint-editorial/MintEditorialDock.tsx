import { Sparkles, Camera, Mic, Send } from 'lucide-react';

/**
 * Mint AI compose dock — always-present surface mirroring the Claude
 * composer pattern from the design package.
 */
export function MintEditorialDock() {
  return (
    <div className='mint-dock'>
      <span className='spark'>
        <Sparkles size={15} strokeWidth={1.75} />
      </span>
      <span className='ph'>
        Ask Mint, or describe a new problem… e.g. "boiler keeps cutting out"
      </span>
      <div className='actions'>
        <button type='button' className='icon-btn' aria-label='Camera'>
          <Camera size={15} strokeWidth={1.75} />
        </button>
        <button type='button' className='icon-btn' aria-label='Mic'>
          <Mic size={15} strokeWidth={1.75} />
        </button>
        <button type='button' className='send' aria-label='Send'>
          <Send size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
