"""
File processor for ingested files from data pipelines.
This module provides functionality to process ingested files and trigger
appropriate processing based on file type.
"""
import os
import json
import logging
import glob
import time
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from utils.telecom_integration import TelecomIntegration
from utils.ml_anomaly_detector import MLAnomalyDetector
from models import LogEntry
from database_models import DBLogEntry, get_db_session

# Configure logging
logger = logging.getLogger(__name__)

class IngestionProcessor:
    """Process ingested files from data pipelines."""
    
    def __init__(self, telecom_processor=None, anomaly_detector=None):
        """
        Initialize the ingestion processor.
        
        Args:
            telecom_processor: Optional TelecomProcessor instance
            anomaly_detector: Optional MLAnomalyDetector instance
        """
        self.telecom_processor = telecom_processor
        self.anomaly_detector = anomaly_detector
        self._processed_files = set()  # Keep track of processed files
        
    def _register_file_as_processed(self, filepath: str) -> None:
        """
        Mark a file as processed to avoid reprocessing.
        
        Args:
            filepath: Path to the file that was processed
        """
        self._processed_files.add(os.path.abspath(filepath))
        
    def is_file_processed(self, filepath: str) -> bool:
        """
        Check if a file has already been processed.
        
        Args:
            filepath: Path to the file to check
            
        Returns:
            True if the file has been processed, False otherwise
        """
        return os.path.abspath(filepath) in self._processed_files
        
    def process_ingestion_directory(self, directory: str, data_type: str = 'telecom_logs') -> Dict[str, Any]:
        """
        Process all files in an ingestion directory.
        
        Args:
            directory: Directory containing ingested files
            data_type: Type of data to expect
            
        Returns:
            Dictionary with processing results
        """
        if not os.path.exists(directory):
            logger.warning(f"Ingestion directory {directory} does not exist")
            return {
                "status": "error",
                "message": f"Directory {directory} does not exist",
                "files_processed": 0
            }
            
        # Get list of files in directory
        files = glob.glob(os.path.join(directory, "*.json"))
        files.extend(glob.glob(os.path.join(directory, "*.log")))
        files.extend(glob.glob(os.path.join(directory, "*.txt")))
        
        # Sort files by creation time (oldest first)
        files.sort(key=lambda x: os.path.getctime(x))
        
        # Filter out already processed files
        files_to_process = [f for f in files if not self.is_file_processed(f)]
        
        # Process each file
        processed_count = 0
        errors = []
        
        for filepath in files_to_process:
            try:
                result = self.process_file(filepath, data_type)
                if result.get("status") == "success":
                    processed_count += 1
                    self._register_file_as_processed(filepath)
                else:
                    errors.append({
                        "file": os.path.basename(filepath),
                        "error": result.get("message", "Unknown error")
                    })
            except Exception as e:
                logger.error(f"Error processing file {filepath}: {str(e)}")
                errors.append({
                    "file": os.path.basename(filepath),
                    "error": str(e)
                })
                
        return {
            "status": "success" if not errors else "partial",
            "directory": directory,
            "total_files": len(files),
            "files_processed": processed_count,
            "files_skipped": len(files) - len(files_to_process),
            "errors": errors
        }
        
    def process_file(self, filepath: str, data_type: str = 'telecom_logs') -> Dict[str, Any]:
        """
        Process a single ingested file.
        
        Args:
            filepath: Path to the file to process
            data_type: Type of data to expect
            
        Returns:
            Dictionary with processing result
        """
        if not os.path.exists(filepath):
            return {
                "status": "error",
                "message": f"File {filepath} does not exist"
            }
            
        file_ext = os.path.splitext(filepath)[1].lower()
        
        try:
            if data_type == 'telecom_logs':
                return self._process_telecom_logs(filepath, file_ext)
            elif data_type == 'metrics':
                return self._process_metrics(filepath, file_ext)
            else:
                # Generic processing
                return self._process_generic(filepath, file_ext)
        except Exception as e:
            logger.error(f"Error processing file {filepath}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to process file: {str(e)}"
            }
            
    def _process_telecom_logs(self, filepath: str, file_ext: str) -> Dict[str, Any]:
        """
        Process telecom log files.
        
        Args:
            filepath: Path to the file to process
            file_ext: File extension
            
        Returns:
            Dictionary with processing result
        """
        # Check if we have a telecom processor
        if not self.telecom_processor:
            return {
                "status": "error",
                "message": "Telecom processor not available"
            }
            
        # Process based on file type
        if file_ext == '.json':
            # Read JSON file
            with open(filepath, 'r') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    return {
                        "status": "error",
                        "message": "Invalid JSON file"
                    }
                    
                # Check if it's a list of logs or a single log entry
                if isinstance(data, list):
                    logs = data
                else:
                    logs = [data]
                    
                # Process each log entry
                log_entries = []
                
                for log in logs:
                    # Create log entry
                    log_entry = LogEntry(
                        timestamp=log.get('timestamp', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                        level=log.get('level', 'INFO'),
                        service=log.get('service', 'unknown'),
                        message=log.get('message', '')
                    )
                    
                    # Add to list of logs
                    log_entries.append(log_entry)
                    
                # Process all log entries
                if log_entries:
                    result = self.telecom_processor.process_logs(log_entries)
                    
                    # Run anomaly detection if available
                    if self.anomaly_detector:
                        try:
                            anomalies = self.anomaly_detector.detect_anomalies(log_entries)
                            # Store anomaly scores
                            session = get_db_session()
                            for i, log in enumerate(log_entries):
                                # Find the corresponding DB entry
                                if hasattr(log, 'id') and log.id:
                                    db_log = session.query(DBLogEntry).filter(DBLogEntry.id == log.id).first()
                                    if db_log and i < len(anomalies):
                                        db_log.anomaly_score = float(anomalies[i])
                            session.commit()
                        except Exception as e:
                            logger.error(f"Error running anomaly detection: {str(e)}")
                    
                    return {
                        "status": "success",
                        "message": f"Processed {len(log_entries)} log entries",
                        "log_count": len(log_entries),
                        "result": result
                    }
                else:
                    return {
                        "status": "error",
                        "message": "No valid log entries found"
                    }
        else:
            # Handle text log files
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Process the raw content
            result = self.telecom_processor.process_raw_logs(content)
            
            return {
                "status": "success",
                "message": f"Processed telecom log file",
                "result": result
            }
            
    def _process_metrics(self, filepath: str, file_ext: str) -> Dict[str, Any]:
        """
        Process metrics files.
        
        Args:
            filepath: Path to the file to process
            file_ext: File extension
            
        Returns:
            Dictionary with processing result
        """
        # Only process JSON files for metrics
        if file_ext != '.json':
            return {
                "status": "error",
                "message": "Only JSON files are supported for metrics"
            }
            
        # Read JSON file
        with open(filepath, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                return {
                    "status": "error",
                    "message": "Invalid JSON file"
                }
                
        # Store metrics in database here if needed
        # For now, we just log the receipt of metrics
        logger.info(f"Received metrics from {filepath}")
        
        return {
            "status": "success",
            "message": "Metrics file processed",
            "metrics_timestamp": data.get('timestamp', time.strftime('%Y-%m-%d %H:%M:%S'))
        }
        
    def _process_generic(self, filepath: str, file_ext: str) -> Dict[str, Any]:
        """
        Process generic files.
        
        Args:
            filepath: Path to the file to process
            file_ext: File extension
            
        Returns:
            Dictionary with processing result
        """
        # Simply log that we received the file
        logger.info(f"Received file {filepath}")
        
        return {
            "status": "success",
            "message": "File registered",
            "file": os.path.basename(filepath)
        }


# Singleton instance
_ingestion_processor = None

def get_ingestion_processor(telecom_processor=None, anomaly_detector=None):
    """
    Get or create the ingestion processor singleton instance.
    
    Args:
        telecom_processor: Optional TelecomProcessor instance
        anomaly_detector: Optional MLAnomalyDetector instance
        
    Returns:
        IngestionProcessor instance
    """
    global _ingestion_processor
    if not _ingestion_processor:
        _ingestion_processor = IngestionProcessor(
            telecom_processor=telecom_processor,
            anomaly_detector=anomaly_detector
        )
    return _ingestion_processor