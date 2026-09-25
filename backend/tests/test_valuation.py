import unittest
from decimal import Decimal
from uuid import uuid4

from app.services.valuation import (
    Adjustment,
    BoqLine,
    ClaimedLine,
    ContractTerms,
    ValuationError,
    value_certificate,
)

TERMS = ContractTerms(retention_percent=Decimal("10"), retention_cap_percent=None, tax_percent=Decimal("15"))


def boq_line(code: str, qty: str, rate: str) -> BoqLine:
    return BoqLine(
        boq_item_id=uuid4(),
        item_code=code,
        description=code,
        unit="m2",
        contract_quantity=Decimal(qty),
        rate=Decimal(rate),
        amount=Decimal(qty) * Decimal(rate),
    )


def claimed(line: BoqLine, qty: str, mos: str | None = None) -> ClaimedLine:
    return ClaimedLine(
        boq_item_id=line.boq_item_id,
        claimed_quantity=Decimal(qty),
        materials_on_site_value=Decimal(mos) if mos else None,
        notes=None,
    )


class ValuationTests(unittest.TestCase):
    def test_items_certified_earlier_stay_in_gross_when_not_claimed_again(self):
        brickwork = boq_line("B1", "100", "200")
        plaster = boq_line("P1", "100", "50")

        valuation = value_certificate(
            terms=TERMS,
            boq_lines=[brickwork, plaster],
            previously_certified_by_code={"B1": Decimal("40")},
            carried_value_outside_boq=Decimal("0"),
            claimed_lines=[claimed(plaster, "20")],
            adjustments={},
            previous_net_certified=Decimal("7200.00"),  # 40 x 200 = 8000 less 10% retention
        )

        # 8000 brickwork carried forward + 1000 plaster this period.
        self.assertEqual(valuation.gross_value_to_date, Decimal("9000.00"))
        self.assertEqual(valuation.retention_held_to_date, Decimal("900.00"))
        self.assertEqual(valuation.amount_due_this_certificate_excl_tax, Decimal("900.00"))
        self.assertEqual(valuation.tax_this_certificate, Decimal("135.00"))
        self.assertEqual({line.boq_line.item_code for line in valuation.lines}, {"B1", "P1"})

    def test_retention_is_limited_by_cap_on_contract_value(self):
        line = boq_line("A", "100", "100")  # contract value 10 000
        terms = ContractTerms(
            retention_percent=Decimal("10"), retention_cap_percent=Decimal("5"), tax_percent=Decimal("0")
        )

        valuation = value_certificate(
            terms=terms,
            boq_lines=[line],
            previously_certified_by_code={},
            carried_value_outside_boq=Decimal("0"),
            claimed_lines=[claimed(line, "80")],
            adjustments={},
            previous_net_certified=Decimal("0"),
        )

        self.assertEqual(valuation.contract_value, Decimal("10000.00"))
        self.assertEqual(valuation.gross_value_to_date, Decimal("8000.00"))
        self.assertEqual(valuation.retention_held_to_date, Decimal("500.00"))

    def test_qs_adjustment_certifies_less_than_claimed(self):
        line = boq_line("A", "100", "100")

        valuation = value_certificate(
            terms=TERMS,
            boq_lines=[line],
            previously_certified_by_code={},
            carried_value_outside_boq=Decimal("0"),
            claimed_lines=[claimed(line, "30")],
            adjustments={line.boq_item_id: Adjustment(Decimal("25"), None, "Measured on site")},
            previous_net_certified=Decimal("0"),
        )

        self.assertEqual(valuation.lines[0].claimed_quantity_this_period, Decimal("30.0000"))
        self.assertEqual(valuation.lines[0].certified_quantity_this_period, Decimal("25.0000"))
        self.assertEqual(valuation.lines[0].notes, "Measured on site")
        self.assertEqual(valuation.gross_value_to_date, Decimal("2500.00"))

    def test_materials_on_site_are_added_to_gross(self):
        line = boq_line("A", "10", "100")

        valuation = value_certificate(
            terms=TERMS,
            boq_lines=[line],
            previously_certified_by_code={},
            carried_value_outside_boq=Decimal("0"),
            claimed_lines=[claimed(line, "0", mos="1500")],
            adjustments={},
            previous_net_certified=Decimal("0"),
        )

        self.assertEqual(valuation.gross_value_to_date, Decimal("1500.00"))

    def test_rejects_certifying_beyond_contract_quantity(self):
        line = boq_line("A", "10", "100")

        with self.assertRaises(ValuationError):
            value_certificate(
                terms=TERMS,
                boq_lines=[line],
                previously_certified_by_code={"A": Decimal("8")},
                carried_value_outside_boq=Decimal("0"),
                claimed_lines=[claimed(line, "3")],
                adjustments={},
                previous_net_certified=Decimal("0"),
            )

    def test_money_is_rounded_half_up_to_cents(self):
        line = boq_line("A", "3", "33.3350")

        valuation = value_certificate(
            terms=TERMS,
            boq_lines=[line],
            previously_certified_by_code={},
            carried_value_outside_boq=Decimal("0"),
            claimed_lines=[claimed(line, "1")],
            adjustments={},
            previous_net_certified=Decimal("0"),
        )

        self.assertEqual(valuation.gross_value_to_date, Decimal("33.34"))
        self.assertEqual(valuation.retention_held_to_date, Decimal("3.33"))
        self.assertEqual(valuation.amount_due_this_certificate_excl_tax, Decimal("30.01"))


if __name__ == "__main__":
    unittest.main()


class RetentionReleaseAndDeductionTests(unittest.TestCase):
    def value(self, release: str, contra: str = "0"):
        line = boq_line("A", "100", "100")
        return value_certificate(
            terms=ContractTerms(
                retention_percent=Decimal("10"),
                retention_cap_percent=None,
                tax_percent=Decimal("0"),
                retention_release_fraction=Decimal(release),
            ),
            boq_lines=[line],
            previously_certified_by_code={},
            carried_value_outside_boq=Decimal("0"),
            claimed_lines=[claimed(line, "50")],
            adjustments={},
            previous_net_certified=Decimal("0"),
            contra_charges_to_date=Decimal(contra),
        )

    def test_half_retention_released_at_practical_completion(self):
        valuation = self.value("0.5")
        self.assertEqual(valuation.retention_held_to_date, Decimal("250.00"))
        self.assertEqual(valuation.retention_released_to_date, Decimal("250.00"))
        self.assertEqual(valuation.net_certified_to_date_excl_tax, Decimal("4750.00"))

    def test_all_retention_released_at_final_completion(self):
        self.assertEqual(self.value("1").retention_held_to_date, Decimal("0.00"))

    def test_contra_charges_reduce_net_value(self):
        valuation = self.value("0", contra="1200")
        self.assertEqual(valuation.contra_charges_to_date, Decimal("1200.00"))
        self.assertEqual(valuation.net_certified_to_date_excl_tax, Decimal("3300.00"))
