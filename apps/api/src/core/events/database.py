# Set UTF-8 encoding environment variables before any imports (Windows compatibility)
import os
import sys
if sys.platform == 'win32':
    # Set Python encoding
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # Set locale environment variables for psycopg2
    os.environ['LANG'] = 'en_US.UTF-8'
    os.environ['LC_ALL'] = 'en_US.UTF-8'
    # Clear PostgreSQL environment variables that might have encoding issues
    # psycopg2 reads these and they might have non-UTF-8 encoding on Windows
    for pg_var in ['PGPASSWORD', 'PGUSER', 'PGHOST', 'PGPORT', 'PGDATABASE']:
        if pg_var in os.environ:
            # Re-encode the value to ensure it's UTF-8
            try:
                value = os.environ[pg_var]
                if isinstance(value, str):
                    # Re-encode to ensure UTF-8
                    clean_value = value.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
                    os.environ[pg_var] = clean_value
            except Exception:
                # If encoding fails, remove the variable
                del os.environ[pg_var]
    # Reconfigure stdout/stderr to use UTF-8 if possible
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    if hasattr(sys.stderr, 'reconfigure'):
        try:
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass

import logging
import importlib
from urllib.parse import urlparse, urlunparse, quote, unquote, parse_qs
from config.config import get_nexo_config
from fastapi import FastAPI
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event

# Workaround for psycopg2 encoding issues on Windows
# Patch psycopg2's connection to handle encoding errors
try:
    import psycopg2
    _original_connect = psycopg2.connect
    
    def _patched_connect(dsn=None, connection_factory=None, **kwargs):
        """Patched connect function to handle encoding issues on Windows"""
        # Clean any string values in kwargs first
        clean_kwargs = {}
        for key, value in kwargs.items():
            if isinstance(value, str):
                try:
                    # Ensure the string is valid UTF-8
                    value_bytes = value.encode('utf-8', errors='ignore')
                    clean_kwargs[key] = value_bytes.decode('utf-8', errors='ignore')
                except Exception:
                    clean_kwargs[key] = value
            else:
                clean_kwargs[key] = value
        
        # The issue is that psycopg2's _connect C function reads from Windows system
        # which may have non-UTF-8 encoding. We need to ensure dsn is explicitly set
        # to an empty string or None, and all parameters are passed as kwargs
        # to avoid psycopg2 trying to read from environment
        
        # If DSN is provided, clean it
        if dsn is not None:
            if isinstance(dsn, str):
                try:
                    dsn_bytes = dsn.encode('utf-8', errors='ignore')
                    dsn = dsn_bytes.decode('utf-8', errors='ignore')
                except Exception:
                    dsn = ''
            # Call with dsn parameter
            if connection_factory:
                return _original_connect(dsn=dsn, connection_factory=connection_factory, **clean_kwargs)
            else:
                return _original_connect(dsn=dsn, **clean_kwargs)
        else:
            # If no DSN, explicitly pass dsn='' to prevent psycopg2 from reading env vars
            # This is critical - passing dsn='' tells psycopg2 not to read from environment
            if connection_factory:
                return _original_connect(dsn='', connection_factory=connection_factory, **clean_kwargs)
            else:
                return _original_connect(dsn='', **clean_kwargs)
    
    # Only patch on Windows
    if sys.platform == 'win32':
        psycopg2.connect = _patched_connect
except ImportError:
    # psycopg2 not available, skip patching
    pass
except Exception as e:
    # If patching fails, log but continue
    logging.warning(f"Failed to patch psycopg2.connect: {e}")

def import_all_models():
    # List of directories to scan for models
    model_configs = [
        {'base_dir': 'src/db', 'base_module_path': 'src.db'},
        {'base_dir': 'ee/db', 'base_module_path': 'ee.db'}
    ]
    
    for config in model_configs:
        base_dir = config['base_dir']
        base_module_path = config['base_module_path']
        
        if not os.path.exists(base_dir):
            continue

        # Recursively walk through the base directory
        for root, dirs, files in os.walk(base_dir):
            # Filter out __init__.py and non-Python files
            module_files = [f for f in files if f.endswith('.py') and f != '__init__.py']
            
            # Calculate the module's base path from its directory structure
            path_diff = os.path.relpath(root, base_dir)
            if path_diff == '.':
                current_module_base = base_module_path
            else:
                current_module_base = f"{base_module_path}.{path_diff.replace(os.sep, '.')}"
            
            # Dynamically import each module
            for file_name in module_files:
                module_name = file_name[:-3]  # Remove the '.py' extension
                full_module_path = f"{current_module_base}.{module_name}"
                try:
                    importlib.import_module(full_module_path)
                except Exception as e:
                    logging.error(f"Failed to import model {full_module_path}: {e}")

# Import all models before creating engine
import_all_models()

nexo_config = get_nexo_config()

# Check if we're in test mode
is_testing = os.getenv("TESTING", "false").lower() == "true"

if is_testing:
    # Use SQLite for tests
    engine = create_engine(
        "sqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False}
    )
else:
    # Use configured database for production/development
    # Ensure connection string is properly encoded as UTF-8 for Windows compatibility
    conn_string = nexo_config.database_config.sql_connection_string
    if not conn_string:
        raise ValueError("Database connection string is not configured")
    
    # Ensure it's a proper UTF-8 string and clean any encoding issues
    if isinstance(conn_string, bytes):
        try:
            conn_string = conn_string.decode('utf-8')
        except UnicodeDecodeError:
            # If UTF-8 decode fails, try with error handling
            conn_string = conn_string.decode('utf-8', errors='replace')
    else:
        conn_string = str(conn_string)
    
    # Normalize the connection string (remove any BOM or hidden characters)
    conn_string = conn_string.strip()
    
    # Parse the connection URL to extract components and reconstruct cleanly
    # This helps avoid encoding issues with psycopg2 on Windows
    try:
        parsed = urlparse(conn_string)
        
        # Extract and clean connection parameters
        user = unquote(parsed.username) if parsed.username else None
        password = unquote(parsed.password) if parsed.password else None
        host = parsed.hostname or 'localhost'
        port = parsed.port or 5432
        database = parsed.path.lstrip('/') if parsed.path else None
        
        # Reconstruct connection string with properly URL-encoded components
        # This ensures all special characters are properly encoded
        if user and password:
            # URL encode user and password to handle special characters
            encoded_user = quote(user, safe='')
            encoded_password = quote(password, safe='')
            netloc = f"{encoded_user}:{encoded_password}@{host}:{port}"
        elif user:
            encoded_user = quote(user, safe='')
            netloc = f"{encoded_user}@{host}:{port}"
        else:
            netloc = f"{host}:{port}"
            
        # Reconstruct the full connection string
        clean_conn_string = urlunparse((
            parsed.scheme,
            netloc,
            f"/{database}" if database else "",
            parsed.params,
            parsed.query,
            parsed.fragment
        ))
        conn_string = clean_conn_string
    except Exception as e:
        # If URL parsing fails, use the original string but ensure it's clean
        logging.warning(f"Failed to parse connection URL, using original: {e}")
        # Remove any non-printable characters that might cause issues
        conn_string = ''.join(c for c in conn_string if c.isprintable() or c in '://@.')
    
    # Log connection string for debugging (without password)
    safe_conn_string = conn_string.split('@')[-1] if '@' in conn_string else conn_string
    logging.debug(f"Connecting to database: ...@{safe_conn_string}")
    
    # Create engine with explicit encoding handling for Windows
    # Use connect_args to set client encoding, which helps with Windows encoding issues
    connect_args = {}
    if 'postgresql' in conn_string.lower():
        # Set client encoding to UTF-8 explicitly
        connect_args["options"] = "-c client_encoding=utf8"
    
    # Create engine with workaround for psycopg2 encoding issues on Windows
    # The error occurs when psycopg2 tries to decode the DSN string
    # We'll use a custom connection creator that passes parameters directly
    # to bypass DSN string parsing that causes encoding issues
    
    # Parse URL to get individual components for direct connection
    parsed_final = urlparse(conn_string)
    db_user = unquote(parsed_final.username) if parsed_final.username else None
    db_password = unquote(parsed_final.password) if parsed_final.password else None
    db_host = parsed_final.hostname or 'localhost'
    db_port = parsed_final.port or 5432
    db_name = parsed_final.path.lstrip('/') if parsed_final.path else None
    
    # Create a custom connection creator that uses direct parameters
    # This avoids the DSN string encoding issue
    def _create_connection():
        """Create connection using direct parameters to avoid DSN encoding issues"""
        import psycopg2
        # Use direct connection parameters instead of DSN string
        # Ensure all string values are clean UTF-8
        conn_params = {}
        
        # Clean and add each parameter
        if db_host:
            conn_params['host'] = str(db_host).encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        if db_port:
            conn_params['port'] = db_port
        if db_name:
            conn_params['database'] = str(db_name).encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        if db_user:
            conn_params['user'] = str(db_user).encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        if db_password:
            conn_params['password'] = str(db_password).encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        
        # Add encoding options if specified
        if connect_args.get('options'):
            conn_params['options'] = str(connect_args['options']).encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
        
        # Call connect with explicit dsn='' to prevent psycopg2 from reading environment
        # This is critical - passing dsn='' explicitly tells psycopg2 not to read from env vars
        # which may have encoding issues on Windows
        return psycopg2.connect(dsn='', **conn_params)
    
    # Build a minimal URL for SQLAlchemy (it needs a URL for dialect detection)
    minimal_url = f"postgresql://{db_user or 'user'}:{db_password or 'pass'}@{db_host}:{db_port}/{db_name or 'db'}"
    
    # Create engine with custom connection creator
    # This bypasses the DSN string parsing that causes encoding errors
    from sqlalchemy.pool import QueuePool
    
    engine = create_engine(
        minimal_url,  # type: ignore
        creator=_create_connection,  # Use custom creator to bypass DSN parsing
        echo=False, 
        poolclass=QueuePool,
        pool_pre_ping=True,  # type: ignore
        pool_size=20,  # Increased from 5 to handle more concurrent requests
        max_overflow=10,  # Allow 10 additional connections beyond pool_size
        pool_recycle=300,  # Recycle connections after 5 minutes
        pool_timeout=30
    )
    
    # Add connection pool monitoring for debugging
    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_connection, connection_record):
        logging.debug("Database connection established")
    
    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        logging.debug("Connection checked out from pool")
    
    @event.listens_for(engine, "checkin")
    def receive_checkin(dbapi_connection, connection_record):
        logging.debug("Connection returned to pool")

# Only create tables if not in test mode (tests will handle this themselves)
# NOTE: We defer table creation to avoid encoding issues on Windows during module import
# Tables will be created in connect_to_db() instead
# if not is_testing:
#     SQLModel.metadata.create_all(engine)
#     # Note: logfire instrumentation will be handled in app.py after configuration

async def connect_to_db(app: FastAPI):
    app.db_engine = engine  # type: ignore
    logging.info("Nexo Academy database has been started.")
    # Only create tables if not in test mode
    if not is_testing:
        SQLModel.metadata.create_all(engine)

def get_db_session():
    with Session(engine) as session:
        yield session

async def close_database(app: FastAPI):
    logging.info("Nexo Academy has been shut down.")
    return app
