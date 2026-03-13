export interface PricedBoqLine {
  boqItemId: string;
  contractQuantity: number;
  rate: number;
}

export interface QuantityPositionInput {
  contractQuantity: number;
  previouslyCertifiedQuantity: number;
  claimedThisPeriodQuantity: number;
  certifiedThisPeriodQuantity?: number;
}

export interface QuantityPosition {
  claimedThisPeriodQuantity: number;
  certifiedThisPeriodQuantity: number;
  certifiedToDateQuantity: number;
  remainingQuantity: number;
  isOverClaimed: boolean;
}

export interface RetentionPolicy {
  retentionPercent: number;
  retentionCapPercent?: number;
}

export interface CertificateTotalsInput {
  contractValue: number;
  workValueToDate: number;
  materialsOnSiteValueToDate?: number;
  preliminariesValueToDate?: number;
  dayworksValueToDate?: number;
  variationValueToDate?: number;
  escalationValueToDate?: number;
  contraChargesToDate?: number;
  otherDeductionsToDate?: number;
  advanceRecoveryToDate?: number;
  previousNetCertifiedExclTax?: number;
  taxPercent?: number;
  retention?: RetentionPolicy;
}

export interface CertificateTotals {
  grossValueToDate: number;
  retentionHeldToDate: number;
  netCertifiedToDateExclTax: number;
  amountDueThisCertificateExclTax: number;
  taxThisCertificate: number;
  amountDueThisCertificateInclTax: number;
}

const clamp = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

export const calculateBoqLineAmount = (quantity: number, rate: number) =>
  quantity * rate;

export const sumContractValue = (lines: Array<PricedBoqLine>) =>
  lines.reduce(
    (total, line) => total + calculateBoqLineAmount(line.contractQuantity, line.rate),
    0
  );

export function calculateQuantityPosition(input: QuantityPositionInput): QuantityPosition {
  const claimedThisPeriodQuantity = clamp(input.claimedThisPeriodQuantity);
  const previouslyCertifiedQuantity = clamp(input.previouslyCertifiedQuantity);
  const contractQuantity = clamp(input.contractQuantity);
  const certifiedThisPeriodQuantity = clamp(
    input.certifiedThisPeriodQuantity ?? claimedThisPeriodQuantity
  );
  const rawCertifiedToDate = previouslyCertifiedQuantity + certifiedThisPeriodQuantity;
  const certifiedToDateQuantity = clamp(rawCertifiedToDate, 0, contractQuantity);
  const remainingQuantity = clamp(contractQuantity - certifiedToDateQuantity);

  return {
    claimedThisPeriodQuantity,
    certifiedThisPeriodQuantity,
    certifiedToDateQuantity,
    remainingQuantity,
    isOverClaimed: rawCertifiedToDate > contractQuantity,
  };
}

export function calculateRetentionHeld(
  grossValueToDate: number,
  contractValue: number,
  retention?: RetentionPolicy
) {
  if (!retention || retention.retentionPercent <= 0) {
    return 0;
  }

  const uncappedRetention = grossValueToDate * (retention.retentionPercent / 100);
  const capValue = retention.retentionCapPercent
    ? contractValue * (retention.retentionCapPercent / 100)
    : Number.POSITIVE_INFINITY;

  return clamp(uncappedRetention, 0, capValue);
}

export function calculateCertificateTotals(
  input: CertificateTotalsInput
): CertificateTotals {
  const grossValueToDate =
    clamp(input.workValueToDate) +
    clamp(input.materialsOnSiteValueToDate ?? 0) +
    clamp(input.preliminariesValueToDate ?? 0) +
    clamp(input.dayworksValueToDate ?? 0) +
    clamp(input.variationValueToDate ?? 0) +
    clamp(input.escalationValueToDate ?? 0) -
    clamp(input.contraChargesToDate ?? 0) -
    clamp(input.otherDeductionsToDate ?? 0);

  const retentionHeldToDate = calculateRetentionHeld(
    grossValueToDate,
    clamp(input.contractValue),
    input.retention
  );

  const netCertifiedToDateExclTax =
    grossValueToDate -
    retentionHeldToDate -
    clamp(input.advanceRecoveryToDate ?? 0);

  const previousNetCertifiedExclTax = clamp(input.previousNetCertifiedExclTax ?? 0);
  const amountDueThisCertificateExclTax = Math.max(
    0,
    netCertifiedToDateExclTax - previousNetCertifiedExclTax
  );
  const taxThisCertificate =
    amountDueThisCertificateExclTax * clamp(input.taxPercent ?? 0) / 100;

  return {
    grossValueToDate,
    retentionHeldToDate,
    netCertifiedToDateExclTax,
    amountDueThisCertificateExclTax,
    taxThisCertificate,
    amountDueThisCertificateInclTax:
      amountDueThisCertificateExclTax + taxThisCertificate,
  };
}
