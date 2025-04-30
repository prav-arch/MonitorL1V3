import re
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import config
from models import LogEntry
from utils.vector_store import VectorStore
from utils.ml_anomaly_detector import anomaly_detector

# Mock sentence transformer for development without requiring the actual model
class MockSentenceTransformer:
    def __init__(self, model_name):
        self.model_name = model_name
        logging.info(f"Initialized mock embedding model: {model_name}")
    
    def encode(self, sentences, **kwargs):
        if isinstance(sentences, str):
            return np.random.rand(384).astype(np.float32)
        return np.random.rand(len(sentences), 384).astype(np.float32)

logger = logging.getLogger(__name__)

class LogProcessor:
    """Class to handle log processing and embedding generation"""
    
    def __init__(self, embedding_model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the log processor with an embedding model"""
        self.embedding_model_name = embedding_model_name
        # Use mock sentence transformer for development
        self.embedding_model = MockSentenceTransformer(embedding_model_name)
        logger.info(f"Loaded mock embedding model: {embedding_model_name}")
            
        # Compile regex patterns for log parsing
        self.log_patterns = {name: re.compile(pattern) for name, pattern in config.LOG_PATTERNS.items()}
    
    def is_healthy(self) -> bool:
        """Check if the embedding model is loaded and operational"""
        return self.embedding_model is not None
    
    def parse_logs(self, log_content: str) -> List[LogEntry]:
        """Parse log content into structured LogEntry objects"""
        lines = log_content.strip().split('\n')
        log_entries = []
        
        for line in lines:
            if not line.strip():
                continue
                
            log_entry = self._parse_log_line(line)
            if log_entry:
                log_entries.append(log_entry)
        
        logger.info(f"Parsed {len(log_entries)} log entries from {len(lines)} lines")
        return log_entries
    
    def _parse_log_line(self, line: str) -> Optional[LogEntry]:
        """Parse a single log line into a LogEntry object"""
        # Try to parse as JSON first
        try:
            log_data = json.loads(line)
            return LogEntry.from_dict(log_data)
        except json.JSONDecodeError:
            pass
        
        # Try each regex pattern
        for pattern_name, pattern in self.log_patterns.items():
            match = pattern.match(line)
            if match:
                log_data = match.groupdict()
                
                # For common patterns, add service if missing
                if "service" not in log_data and pattern_name in ["apache", "nginx"]:
                    log_data["service"] = pattern_name
                
                return LogEntry(
                    timestamp=log_data.get("timestamp", datetime.now().isoformat()),
                    level=log_data.get("level", "INFO"),
                    message=log_data.get("message", line),
                    service=log_data.get("service"),
                    additional_fields={k: v for k, v in log_data.items() 
                                      if k not in ["timestamp", "level", "message", "service"]}
                )
        
        # If no pattern matches, create a basic log entry
        return LogEntry(
            timestamp=datetime.now().isoformat(),
            level="INFO",
            message=line,
            service=None
        )
    
    def process_logs_for_embeddings(self, logs: List[LogEntry], vector_store: VectorStore) -> None:
        """Process log entries and store their embeddings in the vector store"""
        if not self.embedding_model:
            logger.error("Embedding model not available")
            return
        
        # Process logs in batches to avoid memory issues
        batch_size = 100
        for i in range(0, len(logs), batch_size):
            batch = logs[i:i+batch_size]
            
            # Create text representations of logs for embedding
            texts = [self._log_to_text(log) for log in batch]
            
            # Generate embeddings
            embeddings = self.embedding_model.encode(texts)
            
            # Store in vector database with log entry as metadata
            for j, embedding in enumerate(embeddings):
                log_dict = batch[j].to_dict()
                vector_store.add_vector(embedding, log_dict)
            
            logger.debug(f"Processed batch of {len(batch)} logs for embeddings")
        
        # Commit changes to vector store
        vector_store.save()
        logger.info(f"Finished processing {len(logs)} logs for embeddings")
    
    def _log_to_text(self, log: LogEntry) -> str:
        """Convert a log entry to a text representation for embedding"""
        text = f"{log.level} {log.message}"
        if log.service:
            text = f"{log.service}: {text}"
        
        # Add additional fields if they exist
        if log.additional_fields:
            for key, value in log.additional_fields.items():
                text += f" {key}={value}"
                
        return text
    
    def extract_log_stats(self, logs: List[LogEntry]) -> Dict[str, Any]:
        """Extract statistics from a list of log entries"""
        total = len(logs)
        
        # Count by level
        by_level = {}
        for log in logs:
            level = log.level
            by_level[level] = by_level.get(level, 0) + 1
        
        # Count by service
        by_service = {}
        for log in logs:
            service = log.service or "unknown"
            by_service[service] = by_service.get(service, 0) + 1
        
        # Create timeline
        timeline = []
        # Group logs by hour
        hour_counts = {}
        for log in logs:
            try:
                # Parse timestamp to get the hour
                dt = datetime.fromisoformat(log.timestamp.replace('Z', '+00:00'))
                hour_key = dt.strftime("%Y-%m-%dT%H:00:00")
                hour_counts[hour_key] = hour_counts.get(hour_key, 0) + 1
            except ValueError:
                # Skip logs with invalid timestamps
                continue
        
        # Convert to timeline format
        for timestamp, count in sorted(hour_counts.items()):
            timeline.append({"timestamp": timestamp, "count": count})
        
        # ML-based anomaly detection
        anomaly_info = self.detect_anomalies(logs)
        
        return {
            "total": total,
            "by_level": by_level,
            "by_service": by_service,
            "timeline": timeline,
            "anomalies": anomaly_info
        }
    
    def detect_anomalies(self, logs: List[LogEntry]) -> Dict[str, Any]:
        """Detect anomalies in logs using both rule-based and ML-based techniques
        
        Args:
            logs: List of LogEntry objects
            
        Returns:
            Dictionary with anomaly statistics and details
        """
        # Use the ML anomaly detector
        log_scores = anomaly_detector.detect_anomalies_from_entries(logs)
        
        # Extract anomalous logs (score > 0.7 is highly anomalous)
        anomalous_logs = [(log, score) for log, score in log_scores if score > 0.7]
        mild_anomalies = [(log, score) for log, score in log_scores if 0.5 <= score <= 0.7]
        
        # Convert to dictionaries for serialization
        anomalous_log_dicts = [
            {**log.to_dict(), "anomaly_score": float(score), "anomaly_type": "ml_detected"} 
            for log, score in anomalous_logs
        ]
        
        mild_anomaly_dicts = [
            {**log.to_dict(), "anomaly_score": float(score), "anomaly_type": "ml_detected_mild"} 
            for log, score in mild_anomalies
        ]
        
        # Extract patterns for explanation (only if we have enough anomalies)
        anomaly_patterns = []
        if len(anomalous_logs) >= 3:
            anomaly_log_dicts = [log.to_dict() for log, _ in anomalous_logs]
            anomaly_patterns = anomaly_detector.extract_anomaly_patterns(anomaly_log_dicts)
        
        # Rule-based heuristics to supplement ML
        rule_based_anomalies = 0
        for log in logs:
            # Critical errors
            if log.level == "ERROR" or log.level == "CRITICAL":
                if not any(a["id"] == log.id for a in anomalous_log_dicts):
                    anomalous_log_dicts.append({
                        **log.to_dict(), 
                        "anomaly_score": 0.8,
                        "anomaly_type": "rule_based_critical"
                    })
                    rule_based_anomalies += 1
            
            # Warning patterns
            elif log.level == "WARNING" or log.level == "WARN":
                message = log.message.lower()
                if any(term in message for term in ["exception", "fail", "error", "crash"]):
                    if not any(a["id"] == log.id for a in anomalous_log_dicts + mild_anomaly_dicts):
                        mild_anomaly_dicts.append({
                            **log.to_dict(), 
                            "anomaly_score": 0.6,
                            "anomaly_type": "rule_based_warning"
                        })
                        rule_based_anomalies += 1
        
        return {
            "total_anomalies": len(anomalous_log_dicts),
            "mild_anomalies": len(mild_anomaly_dicts),
            "rule_based_detected": rule_based_anomalies,
            "ml_model_trained": anomaly_detector.is_trained(),
            "anomalous_logs": anomalous_log_dicts,
            "mild_anomalous_logs": mild_anomaly_dicts,
            "anomaly_patterns": anomaly_patterns
        }
