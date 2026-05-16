import os
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return None

load_dotenv()


def _env(key: str, default=None):
    value = os.getenv(key, default)
    if isinstance(value, str):
        return value.strip()
    return value


DEBUG = _env("DEBUG", "False").lower() == "true"
HOST = _env("HOST", "0.0.0.0")
PORT = int(_env("PORT", 8000))

ALLOWED_ORIGINS = _env(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
)
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]

LOG_LEVEL = _env("LOG_LEVEL", "INFO")
LOG_FILE = _env("LOG_FILE", None)

# Model defaults
DEFAULT_SEED = int(_env("DEFAULT_SEED", 42))
DEFAULT_TEST_SIZE = float(_env("DEFAULT_TEST_SIZE", 0.2))

# Database / Supabase settings
DATABASE_URL = _env("DATABASE_URL")  # e.g. postgres://user:pass@host:5432/dbname
SUPABASE_URL = _env("SUPABASE_URL")
SUPABASE_KEY = _env("SUPABASE_KEY")
SQLALCHEMY_ECHO = _env("SQLALCHEMY_ECHO", "False").lower() == "true"
