from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime

@dataclass
class LogEntry:
    """Data class representing a log entry"""
    timestamp: str
    level: str
    message: str
    service: Optional[str] = None
    additional_fields: Optional[Dict[str, Any]] = None
    id: Optional[int] = None  # Added ID field for reference
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert LogEntry to dictionary"""
        result = {
            "timestamp": self.timestamp,
            "level": self.level,
            "message": self.message,
            "service": self.service or "unknown"
        }
        
        # Include ID if it exists
        if self.id is not None:
            result["id"] = self.id
            
        # Include additional fields
        if self.additional_fields:
            result.update(self.additional_fields)
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogEntry':
        """Create LogEntry from dictionary"""
        additional_fields = {k: v for k, v in data.items() 
                            if k not in ["timestamp", "level", "message", "service", "id"]}
        
        return cls(
            timestamp=data.get("timestamp", ""),
            level=data.get("level", "INFO"),
            message=data.get("message", ""),
            service=data.get("service"),
            additional_fields=additional_fields if additional_fields else None,
            id=data.get("id")
        )

@dataclass
class AnalysisResult:
    """Data class representing an analysis result"""
    query: str
    suggestion: str
    relevant_logs: List[LogEntry]
    confidence_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert AnalysisResult to dictionary"""
        return {
            "query": self.query,
            "suggestion": self.suggestion,
            "relevant_logs": [log.to_dict() for log in self.relevant_logs],
            "confidence_score": self.confidence_score
        }

@dataclass
class LogStats:
    """Data class representing log statistics"""
    total_logs: int
    logs_by_level: Dict[str, int]
    logs_by_service: Dict[str, int]
    timestamp_distribution: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert LogStats to dictionary"""
        return {
            "total": self.total_logs,
            "by_level": self.logs_by_level,
            "by_service": self.logs_by_service,
            "timeline": self.timestamp_distribution
        }
