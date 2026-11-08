import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

export function amendmentError(
  error: { code?: string; message?: string } | null
) {
  if (!error) return;
  if (error.code === '42501')
    throw new ForbiddenError('You cannot perform this amendment action.');
  if (error.code === 'P0002') throw new NotFoundError('Amendment not found.');
  if (['PT409', '40001', '23505'].includes(error.code ?? ''))
    throw new ConflictError(
      'This proposal or job changed. Refresh the review before continuing.'
    );
  if (error.code === '23514')
    throw new ConflictError(
      'Applying requires a matching accepted bid and one unsigned contract without consent or financial records. Signed work, invoices and funding need a separate variation.'
    );
  if (error.code === '22023')
    throw new BadRequestError('Invalid amendment request.');
  throw new InternalServerError(
    'Amendment service unavailable. Retry or refresh to check the recorded outcome.'
  );
}
