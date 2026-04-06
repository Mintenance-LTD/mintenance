export type TaxClassification =
  | ''
  | 'individual'
  | 'llc_single'
  | 'llc_c'
  | 'llc_s'
  | 'c_corp'
  | 's_corp'
  | 'partnership'
  | 'trust';

export type TinType = 'ssn' | 'ein';

export interface FormData {
  legalName: string;
  businessName: string;
  taxClassification: TaxClassification;
  tinType: TinType;
  tin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  certificationAccepted: boolean;
}

export interface FormErrors {
  legalName?: string;
  taxClassification?: string;
  tin?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  certificationAccepted?: string;
  w9File?: string;
}

export const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
