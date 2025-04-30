"""
PostgreSQL database models for L1 Monitoring application.
This provides fallback models when ClickHouse is not available.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, create_engine, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json
import logging
import os

# Setup logging
logger = logging.getLogger(__name__)

# Create SQLAlchemy base
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
                except:
                    pass
            else:
                additional_data = self.additional_fields
        
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'level': self.level,
            'message': self.message,
            'service': self.service,
            'additional_fields': additional_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_log_entry(cls, log_entry):
        """Create from LogEntry dataclass"""
        # Convert additional_fields to JSON string if it's a dict
        additional_fields_str = None
        if log_entry.additional_fields:
            additional_fields_str = json.dumps(log_entry.additional_fields)
            
        return cls(
            id=log_entry.id,
            timestamp=log_entry.timestamp,
            level=log_entry.level,
            message=log_entry.message,
            service=log_entry.service,
            additional_fields=additional_fields_str
        )
    
    @classmethod
    def to_log_entry(cls, db_log):
        """Convert database log entry to LogEntry dataclass"""
        from models import LogEntry
        
        # Convert additional_fields from string to dict if needed
        additional_fields = None
        if db_log.additional_fields:
            if isinstance(db_log.additional_fields, str):
                try:
                    additional_fields = json.loads(db_log.additional_fields)
                except:
                    additional_fields = {'raw': db_log.additional_fields}
            else:
                additional_fields = db_log.additional_fields
        
        return LogEntry(
            id=db_log.id,
            timestamp=db_log.timestamp,
            level=db_log.level,
            message=db_log.message,
            service=db_log.service,
            additional_fields=additional_fields
        )

class DBAnalysisQuery(Base):
    """Database model for analysis queries"""
    __tablename__ = 'analysis_queries'
    
    id = Column(Integer, primary_key=True)
    query_text = Column(String, nullable=False)
    suggestion = Column(String, nullable=False)
    confidence_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class AnalysisLogAssociation(Base):
    """Association table for analysis queries and relevant logs"""
    __tablename__ = 'analysis_log_associations'
    
    analysis_id = Column(Integer, ForeignKey('analysis_queries.id'), primary_key=True)
    log_id = Column(Integer, ForeignKey('log_entries.id'), primary_key=True)

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
    """Get a PostgreSQL database session"""
    try:
        # Get database URL from environment
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/l1monitoring')
        
        # Create engine and session
        engine = create_engine(db_url)
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        return Session()
    except Exception as e:
        logger.error(f"PostgreSQL connection error: {str(e)}")
        raise e

def init_db():
    """Initialize the PostgreSQL database"""
    try:
        logger.info("Initializing PostgreSQL database...")
        
        # Get database URL from environment
        db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/l1monitoring')
        
        # Create engine and create tables
        engine = create_engine(db_url)
        Base.metadata.create_all(engine)
        
        logger.info("PostgreSQL database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing PostgreSQL database: {str(e)}")
        raise e