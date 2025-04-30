"""
SQLite database models for L1 Monitoring application.
This provides fallback models when ClickHouse is not available.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import json
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Create the SQLite SQLAlchemy base
Base = declarative_base()

class DBLogEntry(Base):
    """Database model for log entries"""
    __tablename__ = 'log_entries'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(String(30), nullable=False)
    level = Column(String(10), nullable=False)
    message = Column(String, nullable=False)
    service = Column(String(50), nullable=True)
    additional_fields = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary representation"""
        # Parse additional_fields from string to dict if it's a string
        additional_data = {}
        if self.additional_fields:
            if isinstance(self.additional_fields, str):
                try:
                    additional_data = json.loads(self.additional_fields)
                except json.JSONDecodeError:
                    additional_data = {"raw_data": self.additional_fields}
            else:
                additional_data = self.additional_fields
                
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "level": self.level,
            "message": self.message,
            "service": self.service or "unknown",
            **additional_data
        }
    
    @classmethod
    def from_log_entry(cls, log_entry):
        """Create from LogEntry dataclass"""
        # Convert additional_fields to JSON string for storage
        additional_fields_str = None
        if log_entry.additional_fields:
            if isinstance(log_entry.additional_fields, str):
                additional_fields_str = log_entry.additional_fields
            else:
                try:
                    additional_fields_str = json.dumps(log_entry.additional_fields)
                except (TypeError, ValueError):
                    additional_fields_str = json.dumps({"data": str(log_entry.additional_fields)})
        
        return cls(
            timestamp=log_entry.timestamp,
            level=log_entry.level,
            message=log_entry.message,
            service=log_entry.service,
            additional_fields=additional_fields_str
        )
        
    @classmethod
    def to_log_entry(cls, db_log):
        """Convert database log entry to LogEntry dataclass"""
        # Import LogEntry class here to avoid circular imports
        from models import LogEntry
        
        # Parse additional_fields from string to dict if needed
        additional_fields = db_log.additional_fields
        if additional_fields and isinstance(additional_fields, str):
            try:
                additional_fields = json.loads(additional_fields)
            except json.JSONDecodeError:
                additional_fields = {"raw_data": additional_fields}
        
        return LogEntry(
            timestamp=db_log.timestamp,
            level=db_log.level,
            message=db_log.message,
            service=db_log.service,
            additional_fields=additional_fields,
            id=db_log.id
        )

class DBAnalysisQuery(Base):
    """Database model for analysis queries"""
    __tablename__ = 'analysis_queries'
    
    id = Column(Integer, primary_key=True)
    query_text = Column(String, nullable=False)
    suggestion = Column(String, nullable=False)
    confidence_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Association table for many-to-many relationship
class AnalysisLogAssociation(Base):
    """Association table for analysis queries and relevant logs"""
    __tablename__ = 'analysis_log_associations'
    
    analysis_id = Column(Integer, primary_key=True)
    log_id = Column(Integer, primary_key=True)

class DBTrainingData(Base):
    """Database model for LLM training data"""
    __tablename__ = 'training_data'
    
    id = Column(Integer, primary_key=True)
    document_path = Column(String, nullable=False)
    document_type = Column(String(20), nullable=False)  # 'log', 'pdf', 'doc', etc.
    content_type = Column(String(50), nullable=False)  # 'telecom', 'general', '5g', 'openran', etc.
    extracted_text = Column(Text, nullable=True)  # Extracted text from document if processed
    embedding_file = Column(String, nullable=True)  # Path to file containing embeddings
    is_processed = Column(Integer, default=0)  # 0=not processed, 1=processed
    created_at = Column(DateTime, default=datetime.utcnow)
    
class DBFineTuningJob(Base):
    """Database model for LLM fine-tuning jobs"""
    __tablename__ = 'fine_tuning_jobs'
    
    id = Column(Integer, primary_key=True)
    job_name = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)  # Base model name
    fine_tuned_model_name = Column(String(100), nullable=True)  # Resulting model name
    status = Column(String(20), nullable=False)  # 'pending', 'running', 'completed', 'failed'
    training_files = Column(Text, nullable=False)  # JSON array of training file IDs
    parameters = Column(Text, nullable=True)  # JSON with fine-tuning parameters
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    error_message = Column(Text, nullable=True)  # Error message if job failed

def get_db_session():
    """Get an SQLite database session"""
    try:
        # Create SQLite in-memory database
        sqlite_engine = create_engine('sqlite:///:memory:')
        
        # Create tables
        Base.metadata.create_all(sqlite_engine)
        
        # Create session
        SQLiteSession = sessionmaker(bind=sqlite_engine)
        return SQLiteSession()
    
    except Exception as e:
        logger.error(f"Error in get_db_session: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Last resort fallback
        engine = create_engine('sqlite:///:memory:')
        Session = sessionmaker(bind=engine)
        return Session()

def init_db():
    """Initialize the SQLite database"""
    try:
        logger.info("Initializing SQLite database...")
        
        # Create engine
        engine = create_engine('sqlite:///:memory:')
        
        # Create tables
        Base.metadata.create_all(engine)
        
        logger.info("SQLite in-memory database initialized successfully.")
        return True
            
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False