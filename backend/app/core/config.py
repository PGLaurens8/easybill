from functools import lru_cache

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "QuantEasy API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"
    frontend_origin: str = "http://localhost:5173"
    # When the SPA and API share an origin (single Vercel project) CORS is not needed at all.
    # Set FRONTEND_ORIGIN_REGEX to allow e.g. your own preview URLs; never allow every *.vercel.app site.
    frontend_origin_regex: str = r"http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?"
    supabase_url: AnyHttpUrl | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None
    sentry_dsn: str | None = None
    # Vercel sets VERCEL=1 in its functions.
    vercel: str | None = None

    @property
    def is_serverless(self) -> bool:
        return bool(self.vercel)

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
