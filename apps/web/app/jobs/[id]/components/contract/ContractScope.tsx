'use client';

import React from 'react';
import {
  Briefcase,
  PoundSterling,
  Scale,
  Calendar,
  FileText,
  Ruler,
} from 'lucide-react';
import {
  formatDate,
  formatCurrency,
  TERMS_HIDDEN_KEYS,
} from './contractHelpers';
import type { Contract } from './useContractData';

interface ContractScopeProps {
  contract: Contract;
  visibleTerms: [string, unknown][];
}

/**
 * Property Rooms Slice 3 — labels mirror PropertyRoomsSection so the
 * homeowner and contractor see the same names everywhere.
 */
const CONTRACT_ROOM_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  living_room: 'Living room',
  dining_room: 'Dining room',
  garage: 'Garage',
  garden: 'Garden',
  exterior: 'Exterior',
  roof: 'Roof',
  hallway: 'Hallway',
  office: 'Office',
  utility: 'Utility',
  other: 'Other',
};

interface ContractRoomSnapshot {
  id?: string;
  name: string;
  room_type: string;
  size_sqm_at_post: number | null;
}

/**
 * Pull contract.terms.scope.rooms and narrow it to the shape we
 * render. Tolerant: if the snapshot is missing or malformed, returns
 * an empty array and the block self-hides — legacy contracts (no
 * room scope) render exactly as before.
 */
function extractScopeRooms(contract: Contract): ContractRoomSnapshot[] {
  const scope = contract.terms?.scope;
  if (!scope || typeof scope !== 'object') return [];
  const rooms = (scope as { rooms?: unknown }).rooms;
  if (!Array.isArray(rooms)) return [];
  return rooms.filter(
    (r): r is ContractRoomSnapshot =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as { name?: unknown }).name === 'string' &&
      typeof (r as { room_type?: unknown }).room_type === 'string'
  );
}

export function ContractScope({ contract, visibleTerms }: ContractScopeProps) {
  const scopeRooms = extractScopeRooms(contract);
  const totalScopeSqm = scopeRooms.reduce<number>(
    (sum, r) => sum + (r.size_sqm_at_post ?? 0),
    0
  );
  const anyScopeSqm = scopeRooms.some((r) => r.size_sqm_at_post != null);

  return (
    <>
      {/* Scope of Work */}
      {(contract.title || contract.description) && (
        <div>
          <div className='flex items-center gap-2 mb-3'>
            <Briefcase className='w-4 h-4 text-teal-600' />
            <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
              Scope of Work
            </h4>
          </div>
          <div className='border border-gray-100 rounded-xl p-4'>
            {contract.title && (
              <p className='font-semibold text-gray-900 text-sm'>
                {contract.title}
              </p>
            )}
            {contract.description && (
              <p className='text-sm text-gray-600 leading-relaxed mt-1.5 whitespace-pre-wrap'>
                {contract.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Property Rooms Slice 3 — frozen room scope.
          Renders only when the contract was created from a job with
          room scope; legacy contracts get nothing here. */}
      {scopeRooms.length > 0 && (
        <div>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <Ruler className='w-4 h-4 text-teal-600' />
              <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Rooms in scope
              </h4>
            </div>
            {anyScopeSqm && totalScopeSqm > 0 ? (
              <span className='text-xs font-semibold text-gray-600'>
                {totalScopeSqm.toFixed(1)} m² total
              </span>
            ) : null}
          </div>
          <ul className='border border-gray-100 rounded-xl p-2 space-y-1'>
            {scopeRooms.map((r, idx) => (
              <li
                key={r.id ?? `${r.name}-${idx}`}
                className='flex items-center justify-between gap-3 px-2 py-1.5'
              >
                <span className='min-w-0 flex-1 text-sm text-gray-900 truncate'>
                  <span className='text-gray-400'>
                    {CONTRACT_ROOM_TYPE_LABELS[r.room_type] ?? r.room_type}
                    {' · '}
                  </span>
                  {r.name}
                </span>
                <span className='shrink-0 text-sm text-gray-600'>
                  {r.size_sqm_at_post != null
                    ? `${Number(r.size_sqm_at_post).toFixed(1)} m²`
                    : '— m²'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payment */}
      <div>
        <div className='flex items-center gap-2 mb-3'>
          <PoundSterling className='w-4 h-4 text-teal-600' />
          <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
            Payment
          </h4>
        </div>
        <div className='bg-gradient-to-r from-gray-50 to-teal-50/30 border border-gray-100 rounded-xl p-5'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                Contract Amount
              </p>
              <p className='text-3xl font-bold text-gray-900 mt-1'>
                {formatCurrency(contract.amount)}
              </p>
            </div>
            <div className='text-right'>
              <div className='inline-flex items-center gap-1.5 bg-teal-50 border border-teal-100 rounded-lg px-3 py-1.5'>
                <Scale className='w-3.5 h-3.5 text-teal-600' />
                <span className='text-xs font-semibold text-teal-700'>
                  Protected Payment
                </span>
              </div>
              <p className='text-[10px] text-gray-400 mt-1.5'>
                Held securely by Mintenance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      {(contract.start_date || contract.end_date) && (
        <div>
          <div className='flex items-center gap-2 mb-3'>
            <Calendar className='w-4 h-4 text-teal-600' />
            <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
              Schedule
            </h4>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            {contract.start_date && (
              <div className='border border-gray-100 rounded-xl p-4'>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                  Start Date
                </p>
                <p className='text-sm font-medium text-gray-900 mt-1'>
                  {formatDate(contract.start_date)}
                </p>
              </div>
            )}
            {contract.end_date && (
              <div className='border border-gray-100 rounded-xl p-4'>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                  Completion
                </p>
                <p className='text-sm font-medium text-gray-900 mt-1'>
                  {formatDate(contract.end_date)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Terms */}
      {visibleTerms.length > 0 && (
        <div>
          <div className='flex items-center gap-2 mb-3'>
            <FileText className='w-4 h-4 text-teal-600' />
            <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
              Additional Terms
            </h4>
          </div>
          <div className='border border-gray-100 rounded-xl p-4 space-y-2'>
            {visibleTerms.map(([key, value]) => (
              <div key={key} className='flex gap-3'>
                <span className='text-xs font-medium text-gray-400 min-w-[100px] capitalize'>
                  {key.replace(/_/g, ' ')}
                </span>
                <span className='text-xs text-gray-700 flex-1 whitespace-pre-wrap'>
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
