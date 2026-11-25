import { savePrivatePdf } from './savePrivatePdf';

/** The contract endpoint returns binary PDF data, never a JSON URL. */
export async function saveContractPdf(contractId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contractId
    )
  ) {
    throw new Error('Invalid contract');
  }
  return savePrivatePdf(
    `/api/contracts/${contractId}/pdf`,
    `Contract-${contractId}`,
    'contract'
  );
}
