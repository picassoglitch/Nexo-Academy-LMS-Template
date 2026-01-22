import uvicorn
import logfire
from fastapi import FastAPI, Request
from config.config import NexoConfig, get_nexo_config
from src.core.events.events import shutdown_app, startup_app
from src.router import v1_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth.exceptions import AuthJWTException
from fastapi.middleware.gzip import GZipMiddleware
from src.core.ee_hooks import register_ee_middlewares


########################
# Pre-Alpha Version 0.1.0
# Author: @swve
# (c) Nexo Academy 2024
########################

# Get Nexo Academy Config
nexo_config: NexoConfig = get_nexo_config()

# Global Config
app = FastAPI(
    title=nexo_config.site_name,
    description=nexo_config.site_description,
    docs_url="/docs" if nexo_config.general_config.development_mode else None,
    redoc_url="/redoc" if nexo_config.general_config.development_mode else None,
    version="0.1.0",
)

# Only enable logfire if explicitly configured
if nexo_config.general_config.logfire_enabled:
    logfire.configure(console=False, service_name=nexo_config.site_name,)
    logfire.instrument_fastapi(app)
    # Instrument database after logfire is configured
    from src.core.events.database import engine
    logfire.instrument_sqlalchemy(engine=engine)

# Gzip Middleware (will add brotli later)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register EE Middlewares if available
register_ee_middlewares(app)

# CORS should wrap the entire app (including any EE middlewares) so headers are present
# even when an inner middleware raises an exception.
dev_origin_regex = (
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    if nexo_config.general_config.development_mode
    else None
)
app.add_middleware(
    CORSMiddleware,
    # Prefer explicit origins when provided (more reliable than regex; fixes dev CORS issues).
    allow_origins=nexo_config.hosting_config.allowed_origins
    if getattr(nexo_config.hosting_config, "allowed_origins", None)
    else [],
    # In local dev, accept both localhost and 127.0.0.1 on any port (avoids CORS mismatch headaches).
    allow_origin_regex=dev_origin_regex
    if dev_origin_regex
    else (
        None
        if getattr(nexo_config.hosting_config, "allowed_origins", None)
        else nexo_config.hosting_config.allowed_regexp
    ),
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)


# Events
app.add_event_handler("startup", startup_app(app))
app.add_event_handler("shutdown", shutdown_app(app))


# JWT Exception Handler
@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(
        status_code=exc.status_code,  # type: ignore
        content={"detail": exc.message},  # type: ignore
    )


# Static Files
app.mount("/content", StaticFiles(directory="content"), name="content")

# Global Routes
app.include_router(v1_router)


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=nexo_config.hosting_config.port,
        reload=nexo_config.general_config.development_mode,
    )


# General Routes
@app.get("/")
async def root():
    return {"Message": "Welcome to Nexo Academy ✨"}
