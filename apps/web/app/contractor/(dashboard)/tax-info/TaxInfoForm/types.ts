export interface FormData {
  legalName: string;
  tradingName: string;
  dateOfBirth: string; // ISO YYYY-MM-DD
  utr: string;
  nino: string;
  vatRegistered: boolean;
  vatNumber: string;
  companyNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  certificationAccepted: boolean;
}

export interface FormErrors {
  legalName?: string;
  dateOfBirth?: string;
  utr?: string;
  nino?: string;
  vatNumber?: string;
  companyNumber?: string;
  addressLine1?: string;
  city?: string;
  postcode?: string;
  certificationAccepted?: string;
}

export const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
