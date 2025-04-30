"""
Database initialization script for L1 Monitoring application
"""
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database_models import init_db, get_db_session, DBLogEntry

logger = logging.getLogger(__name__)

# Sample logs for initial database population
SAMPLE_LOGS = [
    {"timestamp": "2023-10-15T12:34:56", "level": "ERROR", "message": "Connection refused to database server", "service": "database"},
    {"timestamp": "2023-10-15T12:35:01", "level": "ERROR", "message": "Timeout exceeded while waiting for connection", "service": "api"},
    {"timestamp": "2023-10-15T12:35:10", "level": "WARN", "message": "Retry attempt 1 after connection failure", "service": "database"},
    {"timestamp": "2023-10-15T12:36:00", "level": "INFO", "message": "Service restarting", "service": "database"},
    {"timestamp": "2023-10-15T12:37:30", "level": "INFO", "message": "Connection established successfully", "service": "database"}
]

def initialize_database():
    """Initialize the database with sample logs if needed"""
    try:
        # Detect environment
        is_development = True  # Assume development environment by default
        if os.getenv('PRODUCTION') == 'true' or os.name == 'nt':  # Windows or production flag
            is_development = False
            logger.info("Running in production or Windows deployment mode")
        else:
            logger.info("Running in development mode, will use SQLite if external DB unavailable")
        
        # Override DATABASE_URL for development environment if not provided
        if is_development and not os.getenv('DATABASE_URL'):
            logger.info("No DATABASE_URL provided, using SQLite in-memory database for development")
            # Use SQLite in-memory database for development
            os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        
        # Initialize database schema
        db_initialized = init_db()
        
        if db_initialized:
            logger.info("Database initialized successfully")
        else:
            logger.warning("Database initialization returned False, may be using fallback")
            
        # Add sample logs
        try:
            logger.info("Getting database session...")
            session = get_db_session()
            
            # Check if database is empty
            try:
                logger.info("Checking if database is empty...")
                count = session.query(DBLogEntry).count()
                logger.info(f"Found {count} existing log entries")
                
                if count == 0:
                    logger.info("Database is empty, adding sample logs")
                    # Add sample logs directly to database without using LogEntry class
                    for log_data in SAMPLE_LOGS:
                        # Create the database model directly
                        try:
                            additional_fields_str = None
                            extra_fields = {k: v for k, v in log_data.items() 
                                          if k not in ["timestamp", "level", "message", "service"]}
                            
                            if extra_fields:
                                import json
                                additional_fields_str = json.dumps(extra_fields)
                            
                            db_log = DBLogEntry(
                                timestamp=log_data.get("timestamp", ""),
                                level=log_data.get("level", "INFO"),
                                message=log_data.get("message", ""),
                                service=log_data.get("service"),
                                additional_fields=additional_fields_str
                            )
                            session.add(db_log)
                            logger.info(f"Added log: {log_data.get('level')} - {log_data.get('message')}")
                        except Exception as e:
                            logger.error(f"Error adding log entry: {str(e)}")
                    
                    try:
                        session.commit()
                        logger.info("Successfully committed sample logs to database")
                    except Exception as e:
                        logger.error(f"Error committing sample logs: {str(e)}")
                        session.rollback()
            except Exception as e:
                logger.error(f"Error checking database status: {str(e)}")
            
            try:
                session.close()
                logger.info("Database session closed")
            except Exception as e:
                logger.error(f"Error closing session: {str(e)}")
                
        except Exception as e:
            logger.error(f"Failed to add sample logs to database: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
    
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize database
    initialize_database()