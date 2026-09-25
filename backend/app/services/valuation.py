"""Payment certificate valuation.

Pure functions only: no database access, so the arithmetic can be tested and reasoned about
on its own. Follows the usual cumulative method used on South African (JBCC / GCC) contracts:

    gross value to date   = sum(cumulative certified quantity x rate) + materials on site
    retention to date     = gross x retention %, limited to the retention cap (% of contract value)
    net certified to date = gross - retention
    amount due            = net certified to date - net certified on the previous certificate
    tax                   = amount due x tax %
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

ZERO = Decimal("0")
CENT = Decimal("0.01")
QUANTITY_STEP = Decimal("0.0001")


def money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def quantity(value: Decimal) -> Decimal:
    return Decimal(value).quantize(QUANTITY_STEP, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class BoqLine:
    boq_item_id: UUID
    item_code: str
    description: str
    unit: str
    contract_quantity: Decimal
    rate: Decimal
    amount: Decimal


@dataclass(frozen=True)
class ClaimedLine:
    boq_item_id: UUID
    claimed_quantity: Decimal
    materials_on_site_value: Decimal | None
    notes: str | None


@dataclass(frozen=True)
class Adjustment:
    certified_quantity: Decimal
    materials_on_site_value: Decimal | None
    notes: str | None


@dataclass(frozen=True)
class ContractTerms:
    retention_percent: Decimal
    retention_cap_percent: Decimal | None
    tax_percent: Decimal


@dataclass(frozen=True)
class LineValuation:
    boq_line: BoqLine
    previous_certified_quantity: Decimal
    claimed_quantity_this_period: Decimal
    certified_quantity_this_period: Decimal
    work_value_to_date: Decimal
    materials_on_site_value_to_date: Decimal | None
    notes: str | None


@dataclass(frozen=True)
class CertificateValuation:
    contract_value: Decimal
    previous_net_certified_excl_tax: Decimal
    gross_value_to_date: Decimal
    retention_held_to_date: Decimal
    net_certified_to_date_excl_tax: Decimal
    amount_due_this_certificate_excl_tax: Decimal
    tax_this_certificate: Decimal
    amount_due_this_certificate_incl_tax: Decimal
    lines: list[LineValuation]


class ValuationError(ValueError):
    pass


def value_certificate(
    *,
    terms: ContractTerms,
    boq_lines: list[BoqLine],
    previously_certified_by_code: dict[str, Decimal],
    carried_value_outside_boq: Decimal,
    claimed_lines: list[ClaimedLine],
    adjustments: dict[UUID, Adjustment],
    previous_net_certified: Decimal,
) -> CertificateValuation:
    """Value a certificate against the whole BOQ, not just the lines claimed this period.

    ``previously_certified_by_code`` is keyed by item code so quantities carry across BOQ revisions.
    ``carried_value_outside_boq`` is work already certified on items no longer in this revision.
    """
    boq_by_id = {line.boq_item_id: line for line in boq_lines}
    claimed_by_id = {line.boq_item_id: line for line in claimed_lines}

    unknown = (set(claimed_by_id) | set(adjustments)) - set(boq_by_id)
    if unknown:
        raise ValuationError("Certificate lines must belong to the BOQ revision the claim was made against")

    line_valuations: list[LineValuation] = []
    gross = money(carried_value_outside_boq)

    for boq_line in boq_lines:
        previous = quantity(previously_certified_by_code.get(boq_line.item_code, ZERO))
        claimed = claimed_by_id.get(boq_line.boq_item_id)
        adjustment = adjustments.get(boq_line.boq_item_id)

        claimed_quantity = quantity(claimed.claimed_quantity) if claimed else ZERO
        certified_quantity = quantity(adjustment.certified_quantity) if adjustment else claimed_quantity

        if adjustment and adjustment.materials_on_site_value is not None:
            materials_on_site = money(adjustment.materials_on_site_value)
        elif claimed and claimed.materials_on_site_value is not None:
            materials_on_site = money(claimed.materials_on_site_value)
        else:
            materials_on_site = None

        cumulative = previous + certified_quantity
        if cumulative > Decimal(boq_line.contract_quantity):
            raise ValuationError(
                f"Certified quantity for BOQ item {boq_line.item_code} exceeds the contract quantity"
            )

        if cumulative == ZERO and claimed is None and adjustment is None and not materials_on_site:
            continue

        work_value_to_date = money(cumulative * Decimal(boq_line.rate))
        gross += work_value_to_date + (materials_on_site or ZERO)

        notes = adjustment.notes if adjustment and adjustment.notes else (claimed.notes if claimed else None)
        line_valuations.append(
            LineValuation(
                boq_line=boq_line,
                previous_certified_quantity=previous,
                claimed_quantity_this_period=claimed_quantity,
                certified_quantity_this_period=certified_quantity,
                work_value_to_date=work_value_to_date,
                materials_on_site_value_to_date=materials_on_site,
                notes=notes,
            )
        )

    contract_value = money(sum((money(line.amount) for line in boq_lines), ZERO))

    retention = money(gross * Decimal(terms.retention_percent) / Decimal("100"))
    if terms.retention_cap_percent is not None:
        retention_cap = money(contract_value * Decimal(terms.retention_cap_percent) / Decimal("100"))
        retention = min(retention, retention_cap)

    net_to_date = gross - retention
    amount_due = net_to_date - money(previous_net_certified)
    tax = money(amount_due * Decimal(terms.tax_percent) / Decimal("100"))

    return CertificateValuation(
        contract_value=contract_value,
        previous_net_certified_excl_tax=money(previous_net_certified),
        gross_value_to_date=money(gross),
        retention_held_to_date=retention,
        net_certified_to_date_excl_tax=money(net_to_date),
        amount_due_this_certificate_excl_tax=money(amount_due),
        tax_this_certificate=tax,
        amount_due_this_certificate_incl_tax=money(amount_due + tax),
        lines=line_valuations,
    )
