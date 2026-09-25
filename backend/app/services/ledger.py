"""What has been certified to date on a contract. Voided certificates are ignored."""

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.commercial import BoqItem, CertificateBatch, CertificateLine, CertificateStatus
from app.services.valuation import ZERO, money


@dataclass(frozen=True)
class CertifiedToDate:
    quantity_by_item_code: dict[str, Decimal]
    rate_by_item_code: dict[str, Decimal]
    previous_net_certified: Decimal

    def carried_value_outside(self, item_codes: set[str]) -> Decimal:
        """Value of work already certified on items that are not in the given BOQ revision."""
        return sum(
            (
                money(qty * self.rate_by_item_code[code])
                for code, qty in self.quantity_by_item_code.items()
                if code not in item_codes
            ),
            ZERO,
        )


def _live_certificates(organization_id: UUID, contract_id: UUID):
    return select(CertificateBatch).where(
        CertificateBatch.organization_id == organization_id,
        CertificateBatch.contract_id == contract_id,
        CertificateBatch.status != CertificateStatus.voided,
    )


def get_latest_live_certificate(db: Session, organization_id: UUID, contract_id: UUID) -> CertificateBatch | None:
    return db.scalar(
        _live_certificates(organization_id, contract_id).order_by(CertificateBatch.created_at.desc())
    )


def get_certified_to_date(db: Session, organization_id: UUID, contract_id: UUID) -> CertifiedToDate:
    live_ids = _live_certificates(organization_id, contract_id).with_only_columns(CertificateBatch.id)
    rows = db.execute(
        select(BoqItem.item_code, CertificateLine.certified_quantity_this_period, CertificateLine.rate)
        .join(BoqItem, BoqItem.id == CertificateLine.boq_item_id)
        .join(CertificateBatch, CertificateBatch.id == CertificateLine.certificate_batch_id)
        .where(CertificateLine.certificate_batch_id.in_(live_ids))
        .order_by(CertificateBatch.created_at.asc())
    ).all()

    quantities: dict[str, Decimal] = {}
    rates: dict[str, Decimal] = {}
    for item_code, certified_quantity, rate in rows:
        quantities[item_code] = quantities.get(item_code, ZERO) + Decimal(certified_quantity or 0)
        rates[item_code] = Decimal(rate)

    latest = get_latest_live_certificate(db, organization_id, contract_id)
    previous_net = Decimal(latest.net_certified_to_date_excl_tax) if latest else ZERO
    return CertifiedToDate(quantities, rates, previous_net)
