from fastapi import APIRouter

from app.api.routes import boq_revisions, claims, contracts, organizations, projects

api_router = APIRouter()
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(boq_revisions.router, prefix="/boq-revisions", tags=["boq-revisions"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
