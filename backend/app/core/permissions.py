"""Single source of truth for who may do what.

Roles map to the people on a typical main-contractor job:

- OrgAdmin: director / system owner, can do everything.
- CommercialManager: senior QS / commercial lead.
- QuantitySurveyor: prepares BOQs, reviews claims, certifies payment.
- Contractor: a subcontractor's own login, limited to contracts assigned to them.
- Accounts: pays certificates, read-only on the commercial detail.
"""

from app.models.commercial import ClaimStatus, MembershipRole

ALL_ROLES = frozenset(MembershipRole)

ORG_ADMIN_ROLES = frozenset({MembershipRole.org_admin})

COMMERCIAL_WRITE_ROLES = frozenset(
    {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.quantity_surveyor,
    }
)

CLAIM_PREPARE_ROLES = COMMERCIAL_WRITE_ROLES | {MembershipRole.contractor}

CERTIFY_ROLES = COMMERCIAL_WRITE_ROLES

PAYMENT_ROLES = frozenset(
    {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.accounts,
    }
)

REVIEW_ROLES = frozenset(
    {
        MembershipRole.org_admin,
        MembershipRole.commercial_manager,
        MembershipRole.quantity_surveyor,
    }
)

# Draft -> Submitted -> (UnderReview, optional) -> Approved -> Certified -> Paid.
# Certified is normally reached by issuing a payment certificate, not by hand.
ALLOWED_CLAIM_STATUS_TRANSITIONS: dict[ClaimStatus, frozenset[ClaimStatus]] = {
    ClaimStatus.draft: frozenset({ClaimStatus.submitted}),
    ClaimStatus.submitted: frozenset({ClaimStatus.under_review, ClaimStatus.approved, ClaimStatus.rejected}),
    ClaimStatus.under_review: frozenset({ClaimStatus.approved, ClaimStatus.rejected}),
    ClaimStatus.approved: frozenset({ClaimStatus.certified, ClaimStatus.rejected}),
    ClaimStatus.rejected: frozenset({ClaimStatus.draft}),
    ClaimStatus.certified: frozenset({ClaimStatus.paid}),
    ClaimStatus.paid: frozenset(),
}

CLAIM_TRANSITION_ALLOWED_ROLES: dict[tuple[ClaimStatus, ClaimStatus], frozenset[MembershipRole]] = {
    (ClaimStatus.draft, ClaimStatus.submitted): CLAIM_PREPARE_ROLES,
    (ClaimStatus.submitted, ClaimStatus.under_review): REVIEW_ROLES,
    (ClaimStatus.submitted, ClaimStatus.approved): REVIEW_ROLES,
    (ClaimStatus.submitted, ClaimStatus.rejected): REVIEW_ROLES,
    (ClaimStatus.under_review, ClaimStatus.approved): REVIEW_ROLES,
    (ClaimStatus.under_review, ClaimStatus.rejected): REVIEW_ROLES,
    (ClaimStatus.approved, ClaimStatus.rejected): REVIEW_ROLES,
    (ClaimStatus.rejected, ClaimStatus.draft): CLAIM_PREPARE_ROLES,
    (ClaimStatus.approved, ClaimStatus.certified): CERTIFY_ROLES,
    (ClaimStatus.certified, ClaimStatus.paid): PAYMENT_ROLES,
}
