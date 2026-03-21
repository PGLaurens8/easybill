import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import engine

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    logger.info(
        'application_startup',
        extra={
            'app_env': settings.app_env,
            'frontend_origins': settings.frontend_origins,
            'frontend_origin_regex': settings.frontend_origin_regex,
        },
    )

    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
            inspector = inspect(connection)
            table_names = set(inspector.get_table_names())
            logger.info(
                'database_startup_check',
                extra={
                    'database_ok': True,
                    'has_organizations_table': 'organizations' in table_names,
                    'has_memberships_table': 'memberships' in table_names,
                    'table_count': len(table_names),
                },
            )
    except SQLAlchemyError:
        logger.exception('database_startup_check_failed')

    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=settings.frontend_origin_regex,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_: Request, exc: SQLAlchemyError):
    logger.exception('database_request_failed')
    return JSONResponse(status_code=500, content={'detail': 'Database request failed'})


@app.exception_handler(httpx.HTTPError)
async def httpx_exception_handler(_: Request, exc: httpx.HTTPError):
    logger.exception('outbound_http_request_failed')
    return JSONResponse(status_code=503, content={'detail': 'Upstream service request failed'})


app.include_router(health_router)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get('/')
def root() -> dict[str, str]:
    return {'service': settings.app_name, 'environment': settings.app_env}
