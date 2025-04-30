import logging
from typing import List, Dict, Any
import numpy as np
from utils.vector_store import VectorStore
from utils.llm_interface import LLMInterface
import config

logger = logging.getLogger(__name__)

class RAGEngine:
    """Retrieval Augmented Generation engine for log analysis"""
    
    def __init__(self, vector_store: VectorStore, llm_interface: LLMInterface):
        """Initialize the RAG engine with vector store and LLM interface"""
        self.vector_store = vector_store
        self.llm_interface = llm_interface
        self.knowledge_sources = config.KNOWLEDGE_SOURCES
        
        # Add knowledge sources to vector store if they don't exist
        self._initialize_knowledge_sources()
    
    def _initialize_knowledge_sources(self) -> None:
        """Initialize knowledge sources in the vector store"""
        if not self.vector_store.is_initialized():
            logger.info("Initializing knowledge sources in vector store")
            
            # Add knowledge sources as vectors
            for knowledge in self.knowledge_sources:
                # Generate embedding for knowledge (in a real app, we'd use the embedding model)
                # Here we'll use a simple random vector as placeholder
                embedding = np.random.rand(384).astype(np.float32)  # Using 384 dimensions for MiniLM-L6
                
                # Add to vector store with metadata
                self.vector_store.add_vector(embedding, {
                    "type": "knowledge",
                    "content": knowledge
                })
            
            # Save the vector store
            self.vector_store.save()
            logger.info(f"Added {len(self.knowledge_sources)} knowledge sources to vector store")
    
    def retrieve_relevant_logs(self, query: str, top_k: int = 5, 
                             filter_criteria: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Retrieve relevant logs based on a query using vector similarity with filtering
        
        Args:
            query: The search query text
            top_k: The number of results to return
            filter_criteria: Dictionary of metadata field criteria to filter results
                Example: {"level": "ERROR", "service": "database"}
                
        Returns:
            List of relevant log entries
        """
        # In a real application, we would:
        # 1. Convert the query to an embedding using the same model as the log processor
        # 2. Perform similarity search in the vector store
        
        if not self.vector_store.is_initialized():
            logger.warning("Vector store not initialized, returning empty results")
            return []
        
        try:
            # Create a mock query vector (in a real app, this would be generated from the query)
            query_vector = np.random.rand(384).astype(np.float32)
            
            # Apply content type filter to exclude knowledge sources if not specified
            combined_filters = filter_criteria.copy() if filter_criteria else {}
            
            # Ensure we're not getting knowledge entries unless specifically requested
            if "type" not in combined_filters:
                # This will filter out items with the "type" field present (knowledge entries)
                # by doing a post-processing filter, not at the database level
                knowledge_filter = False
            else:
                knowledge_filter = True
            
            # Retrieve similar vectors with filters
            results = self.vector_store.search(query_vector, k=top_k, filter_criteria=combined_filters)
            
            # Extract log entries from results, filtering out knowledge entries unless requested
            if knowledge_filter:
                # Include knowledge entries if specifically requested by type filter
                logs = [item["metadata"] for item in results]
            else:
                # Filter out knowledge entries (items with a "type" field)
                logs = [item["metadata"] for item in results if "type" not in item["metadata"]]
            
            logger.debug(f"Retrieved {len(logs)} relevant logs for query: {query} with filters: {combined_filters}")
            return logs
            
        except Exception as e:
            logger.error(f"Error retrieving relevant logs: {str(e)}")
            return []
    
    def generate_suggestion(self, query: str, context_logs: List[Dict[str, Any]]) -> str:
        """Generate a troubleshooting suggestion using the LLM and retrieved context"""
        if not self.llm_interface.is_healthy():
            logger.warning("LLM not healthy, returning basic suggestion")
            return "Unable to generate suggestion as the language model is not available."
        
        try:
            # Generate suggestion using the LLM
            suggestion = self.llm_interface.generate_troubleshooting_suggestion(query, context_logs)
            
            logger.debug(f"Generated suggestion for query: {query}")
            return suggestion
            
        except Exception as e:
            logger.error(f"Error generating suggestion: {str(e)}")
            return f"Error generating suggestion: {str(e)}"
    
    def analyze_logs(self, query: str, selected_logs: List[Dict[str, Any]] = None,
                    filter_criteria: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyze logs based on a query and generate a suggestion with filtering
        
        Args:
            query: The search query text
            selected_logs: Optional list of pre-selected logs to include
            filter_criteria: Dictionary of metadata field criteria to filter results
                Example: {"level": "ERROR", "service": "database"}
                
        Returns:
            Dictionary containing suggestion and relevant logs
        """
        # Retrieve relevant logs with filtering
        relevant_logs = self.retrieve_relevant_logs(query, filter_criteria=filter_criteria)
        
        # Combine with selected logs if provided
        if selected_logs:
            context_logs = relevant_logs + selected_logs
        else:
            context_logs = relevant_logs
        
        # Generate suggestion
        suggestion = self.generate_suggestion(query, context_logs)
        
        return {
            "suggestion": suggestion,
            "relevant_logs": relevant_logs,
            "filters_applied": filter_criteria or {}
        }
