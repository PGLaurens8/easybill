from fastapi import APIRouter

from app.api.routes import (
    boq_revisions,
    certificates,
    claims,
    contracts,
    invitations,
    organizations,
    projects,
    variations,
)

api_router = APIRouter()
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["invitations"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(boq_revisions.router, prefix="/boq-revisions", tags=["boq-revisions"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["certificates"])
api_router.include_router(variations.variations_router, prefix="/variations", tags=["variations"])
api_router.include_router(variations.contra_charges_router, prefix="/contra-charges", tags=["contra-charges"])
