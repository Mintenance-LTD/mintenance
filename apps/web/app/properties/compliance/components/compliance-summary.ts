import type { ComplianceCert } from './compliance-types';
import type { Applicability } from './ApplicabilityForm';
const coreTypes = ['gas_safety', 'eicr', 'epc', 'smoke_alarm', 'co_detector'];
type Assessment = Applicability & { property_id: string; cert_type: string };
export function complianceSummary(
  properties: { id: string; property_name: string; address: string }[],
  certificates: ComplianceCert[],
  assessments: Assessment[]
) {
  let missingCount = 0,
    unassessedCount = 0;
  const applicableCerts = certificates.filter(
    (cert) =>
      !assessments.some(
        (a) =>
          a.property_id === cert.property_id &&
          a.cert_type === cert.cert_type &&
          a.decision === 'not_applicable'
      )
  );
  const propertiesWithCompliance = properties.map((property) => {
    const certs = certificates.filter(
      (cert) => cert.property_id === property.id
    );
    const active = applicableCerts.filter(
      (cert) => cert.property_id === property.id
    );
    const applicability = Object.fromEntries(
      assessments
        .filter((a) => a.property_id === property.id)
        .map((a) => [a.cert_type, { decision: a.decision, reason: a.reason }])
    );
    let needsReview = false;
    const certMap = Object.fromEntries(
      coreTypes.map((type) => {
        const cert = certs.find((cert) => cert.cert_type === type) || null;
        const decision = applicability[type]?.decision || 'unknown';
        if (decision === 'unknown') {
          unassessedCount++;
          needsReview = true;
        }
        if (decision === 'applicable' && !cert) {
          missingCount++;
          needsReview = true;
        }
        return [type, cert];
      })
    );
    return {
      ...property,
      certMap,
      applicability,
      additionalCerts: certs.filter(
        (cert) => !coreTypes.includes(cert.cert_type)
      ),
      certCount: certs.length,
      overallStatus: active.some((cert) => cert.status === 'expired')
        ? 'red'
        : needsReview || active.some((cert) => cert.status !== 'valid')
          ? 'amber'
          : 'green',
    };
  });
  return {
    propertiesWithCompliance,
    summary: {
      totalProperties: properties.length,
      totalCerts: certificates.length,
      validCount: applicableCerts.filter((cert) => cert.status === 'valid')
        .length,
      expiredCount: applicableCerts.filter((cert) => cert.status === 'expired')
        .length,
      expiringCount: applicableCerts.filter(
        (cert) => cert.status === 'expiring'
      ).length,
      missingCount,
      unassessedCount,
    },
  };
}
