"""
Integration module for telecom-specific components into the main application.
This module handles the setup and initialization of telecom-specific processing
and RAG components, connecting them to the main application.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from utils.telecom_processor import TelecomLogProcessor
from utils.telecom_rag_engine import TelecomRAGEngine
from models import LogEntry

# Configure logging
logger = logging.getLogger(__name__)

class TelecomIntegration:
    """Class to integrate telecom-specific components with the main application"""
    
    def __init__(self, base_log_processor=None, base_rag_engine=None):
        """Initialize telecom integration with base components
        
        Args:
            base_log_processor: The base log processor to extend
            base_rag_engine: The base RAG engine to extend
        """
        self.base_log_processor = base_log_processor
        self.base_rag_engine = base_rag_engine
        self.telecom_log_processor = None
        self.telecom_rag_engine = None
        self.initialized = False
        
        # Initialize telecom components if base components provided
        if self.base_log_processor is not None and self.base_rag_engine is not None:
            self.initialize()
            
    def _initialize_components(self):
        """Initialize telecom components if not already initialized"""
        if not self.initialized:
            self.initialize()
            
    def get_processor(self):
        """Get the telecom log processor instance.
        
        Returns:
            The telecom log processor instance or None if not initialized.
        """
        if not self.telecom_log_processor:
            self._initialize_components()
        return self.telecom_log_processor
            
    def initialize(self) -> bool:
        """Initialize telecom-specific components
        
        Returns:
            True if initialization successful, False otherwise
        """
        if self.initialized:
            return True
            
        try:
            # Initialize telecom log processor
            self.telecom_log_processor = TelecomLogProcessor(
                base_processor=self.base_log_processor
            )
            
            # Initialize telecom RAG engine
            self.telecom_rag_engine = TelecomRAGEngine(
                base_rag_engine=self.base_rag_engine,
                telecom_processor=self.telecom_log_processor
            )
            
            # Set initialized flag
            self.initialized = True
            logger.info("Telecom components initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize telecom components: {e}")
            return False
            
    def is_healthy(self) -> bool:
        """Check if telecom components are healthy
        
        Returns:
            True if components are healthy, False otherwise
        """
        return self.initialized and self.telecom_log_processor is not None and self.telecom_rag_engine is not None
        
    def is_telecom_log(self, log_entry: LogEntry) -> bool:
        """Check if a log entry is telecom-related
        
        Args:
            log_entry: The log entry to check
            
        Returns:
            True if telecom-related, False otherwise
        """
        if not self.initialized or self.telecom_log_processor is None:
            return False
            
        return self.telecom_log_processor.detect_telecom_log_type(log_entry) is not None
        
    def process_logs(self, log_entries: List[LogEntry]) -> List[LogEntry]:
        """Process log entries with telecom-specific enrichment
        
        Args:
            log_entries: List of log entries to process
            
        Returns:
            Processed log entries with telecom metadata
        """
        if not self.initialized or self.telecom_log_processor is None:
            return log_entries
            
        processed_entries = []
        for entry in log_entries:
            if self.is_telecom_log(entry):
                processed_entries.append(self.telecom_log_processor.enrich_log_entry(entry))
            else:
                processed_entries.append(entry)
                
        return processed_entries
        
    def parse_telecom_logs(self, log_content: str) -> List[LogEntry]:
        """Parse telecom-specific log formats into LogEntry objects
        
        Args:
            log_content: The raw log content to parse
            
        Returns:
            List of parsed LogEntry objects
        """
        if not self.initialized or self.telecom_log_processor is None:
            return []
            
        return self.telecom_log_processor.parse_telecom_logs(log_content)
        
    def analyze_telecom_logs(self, query: str, selected_logs: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze telecom logs based on query and generate suggestion
        
        Args:
            query: The user's query
            selected_logs: Optional list of user-selected logs
            
        Returns:
            Analysis result with telecom-specific information
        """
        if not self.initialized or self.telecom_rag_engine is None:
            return {
                "query": query,
                "suggestion": "Telecom-specific analysis not available",
                "relevant_context": selected_logs or [],
                "telecom_anomalies": {},
                "domain": "unknown"
            }
            
        return self.telecom_rag_engine.analyze_telecom_logs(query, selected_logs)
        
    def load_sample_telecom_logs(self) -> List[LogEntry]:
        """Load sample telecom logs for testing
        
        Returns:
            List of telecom log entries
        """
        if not self.initialized or self.telecom_log_processor is None:
            return []
            
        sample_logs = []
        sample_logs_dir = os.path.join('data', 'telecom_kb', 'sample_logs')
        
        # Check if directory exists
        if not os.path.exists(sample_logs_dir):
            logger.warning(f"Sample logs directory not found: {sample_logs_dir}")
            return []
            
        # Load 5G Core logs
        core_logs_path = os.path.join(sample_logs_dir, '5g_core_logs.txt')
        if os.path.exists(core_logs_path):
            try:
                with open(core_logs_path, 'r') as f:
                    core_logs_content = f.read()
                core_logs = self.telecom_log_processor.parse_telecom_logs(core_logs_content)
                sample_logs.extend(core_logs)
                logger.info(f"Loaded {len(core_logs)} 5G Core sample logs")
            except Exception as e:
                logger.error(f"Failed to load 5G Core sample logs: {e}")
                
        # Load OpenRAN logs
        openran_logs_path = os.path.join(sample_logs_dir, 'openran_logs.txt')
        if os.path.exists(openran_logs_path):
            try:
                with open(openran_logs_path, 'r') as f:
                    openran_logs_content = f.read()
                openran_logs = self.telecom_log_processor.parse_telecom_logs(openran_logs_content)
                sample_logs.extend(openran_logs)
                logger.info(f"Loaded {len(openran_logs)} OpenRAN sample logs")
            except Exception as e:
                logger.error(f"Failed to load OpenRAN sample logs: {e}")
                
        return sample_logs
        
    def detect_telecom_anomalies(self, log_entries: List[LogEntry]) -> Dict[str, Any]:
        """Detect telecom-specific anomalies in logs
        
        Args:
            log_entries: List of log entries to analyze
            
        Returns:
            Dictionary with telecom anomaly information
        """
        if not self.initialized or self.telecom_log_processor is None:
            return {
                "telecom_anomalies_count": 0,
                "telecom_anomalies": [],
                "telecom_anomaly_patterns": []
            }
            
        return self.telecom_log_processor.detect_telecom_anomalies(log_entries)
        
    def generate_domain_knowledge(self) -> Dict[str, Any]:
        """Generate telecom domain knowledge
        
        Returns:
            Dictionary with telecom domain knowledge
        """
        if not self.initialized or self.telecom_log_processor is None:
            return {}
            
        return self.telecom_log_processor.generate_telecom_domain_knowledge()