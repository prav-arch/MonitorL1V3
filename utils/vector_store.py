import os
import logging
import pickle
import numpy as np
import threading
import time
import atexit
import signal
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logging.warning("FAISS not available, using simple vector store implementation")

logger = logging.getLogger(__name__)

class VectorStore:
    """Vector store implementation for storing and retrieving embeddings"""
    
    def __init__(self, index_path: str, vector_dim: int = 384, auto_save_interval: int = 300):
        """
        Initialize the vector store with an index path and vector dimension
        
        Args:
            index_path: Path to save/load the vector index
            vector_dim: Dimension of the vectors
            auto_save_interval: Seconds between auto-saves (0 to disable)
        """
        self.index_path = index_path
        self.vector_dim = vector_dim
        self.auto_save_interval = auto_save_interval
        self.index = None
        self.metadata = []
        self.initialized = False
        self.modified_since_save = False
        self.auto_save_thread = None
        self.shutting_down = False
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        
        # Try to load existing index
        self._load_index()
        
        # Set up auto-save if enabled
        if self.auto_save_interval > 0:
            self._setup_auto_save()
            
        # Register shutdown handler to save data on exit
        atexit.register(self._shutdown_handler)
        signal.signal(signal.SIGTERM, lambda signum, frame: self._shutdown_handler())
        signal.signal(signal.SIGINT, lambda signum, frame: self._shutdown_handler())
    
    def is_initialized(self) -> bool:
        """Check if the vector store is initialized"""
        return self.initialized
    
    def is_healthy(self) -> bool:
        """Check if the vector store is healthy"""
        return self.initialized and (
            (FAISS_AVAILABLE and self.index is not None) or 
            (not FAISS_AVAILABLE and len(self.metadata) > 0)
        )
    
    def _load_index(self) -> None:
        """Load the vector index from disk"""
        index_file = f"{self.index_path}.index"
        metadata_file = f"{self.index_path}.metadata"
        
        if os.path.exists(index_file) and os.path.exists(metadata_file):
            try:
                # Load metadata
                with open(metadata_file, 'rb') as f:
                    self.metadata = pickle.load(f)
                
                # Load index
                if FAISS_AVAILABLE:
                    self.index = faiss.read_index(index_file)
                else:
                    with open(index_file, 'rb') as f:
                        self.index = pickle.load(f)
                
                self.initialized = True
                logger.info(f"Loaded vector store with {len(self.metadata)} vectors")
            except Exception as e:
                logger.error(f"Failed to load vector store: {str(e)}")
                self._initialize_new_index()
        else:
            logger.info("Vector store not found, initializing new one")
            self._initialize_new_index()
    
    def _initialize_new_index(self) -> None:
        """Initialize a new vector index"""
        if FAISS_AVAILABLE:
            # Use FAISS for efficient similarity search
            self.index = faiss.IndexFlatL2(self.vector_dim)
        else:
            # Simple numpy-based vector store
            self.index = []
        
        self.metadata = []
        self.initialized = True
        logger.info("Initialized new vector store")
    
    def add_vector(self, vector: np.ndarray, metadata: Dict[str, Any]) -> None:
        """Add a vector and its metadata to the store"""
        if not self.initialized:
            logger.warning("Vector store not initialized")
            return
        
        # Ensure vector is the right shape and type
        vector = np.array(vector).astype(np.float32).reshape(1, -1)
        
        if FAISS_AVAILABLE:
            self.index.add(vector)
        else:
            self.index.append(vector.flatten())
        
        self.metadata.append(metadata)
        
        # Save immediately after adding a vector
        self.save()
    
    def search(self, query_vector: np.ndarray, k: int = 5, 
               filter_criteria: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Search for similar vectors in the store with optional filtering
        
        Args:
            query_vector: The vector to search for
            k: The number of results to return
            filter_criteria: Dictionary of metadata field criteria to filter results
                Example: {"level": "ERROR", "service": "database"}
                
        Returns:
            List of dictionaries containing score and metadata
        """
        if not self.initialized:
            logger.warning("Vector store not initialized")
            return []
        
        if len(self.metadata) == 0:
            logger.warning("Vector store is empty")
            return []
        
        # Ensure query vector is the right shape and type
        query_vector = np.array(query_vector).astype(np.float32).reshape(1, -1)
        
        try:
            if FAISS_AVAILABLE:
                # Use FAISS for search but handle filtering in post-processing
                # First get more results than requested to allow for filtering
                search_k = min(k * 10, len(self.metadata)) if filter_criteria else min(k, len(self.metadata))
                distances, indices = self.index.search(query_vector, search_k)
                
                # Get all candidate results before filtering
                all_results = [
                    {"score": float(1.0 / (1.0 + distances[0][i])), 
                     "metadata": self.metadata[int(indices[0][i])],
                     "index": int(indices[0][i])}
                    for i in range(len(indices[0]))
                ]
            else:
                # Simple numpy-based search
                all_vectors = np.array(self.index)
                distances = np.linalg.norm(all_vectors - query_vector, axis=1)
                
                # Get more indices if filtering
                search_k = min(k * 10, len(self.metadata)) if filter_criteria else min(k, len(self.metadata))
                indices = np.argsort(distances)[:search_k]
                
                # Get all candidate results before filtering
                all_results = [
                    {"score": float(1.0 / (1.0 + distances[i])), 
                     "metadata": self.metadata[i],
                     "index": i}
                    for i in indices
                ]
            
            # Apply filters if provided
            if filter_criteria:
                filtered_results = self._apply_filters(all_results, filter_criteria)
                # Truncate to requested k after filtering
                results = filtered_results[:k]
            else:
                # Just take the top k without filtering
                results = all_results[:k]
            
            # Remove the index field which was just used internally
            for result in results:
                result.pop("index", None)
                
            return results
        
        except Exception as e:
            logger.error(f"Error during vector search: {str(e)}")
            return []
    
    def _apply_filters(self, results: List[Dict[str, Any]], 
                       filter_criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Filter search results based on metadata criteria
        
        Args:
            results: List of search results with metadata
            filter_criteria: Dictionary of metadata field criteria
                
        Returns:
            Filtered list of results
        """
        filtered = []
        
        for result in results:
            metadata = result.get("metadata", {})
            
            # Check if the metadata matches all filter criteria
            if self._matches_criteria(metadata, filter_criteria):
                filtered.append(result)
        
        return filtered
    
    def _matches_criteria(self, metadata: Dict[str, Any], 
                          filter_criteria: Dict[str, Any]) -> bool:
        """
        Check if metadata matches all specified filter criteria
        
        Args:
            metadata: The metadata dict to check
            filter_criteria: Dictionary of criteria to match
                
        Returns:
            True if all criteria match, False otherwise
        """
        for key, value in filter_criteria.items():
            # Handle nested keys with dot notation (e.g., "user.id")
            if "." in key:
                parts = key.split(".")
                obj = metadata
                for part in parts[:-1]:
                    if part not in obj:
                        return False
                    obj = obj[part]
                
                # Check final part
                if parts[-1] not in obj or obj[parts[-1]] != value:
                    return False
            
            # Handle list contains (if value is list and criteria is in the list)
            elif isinstance(metadata.get(key), list) and value not in metadata[key]:
                return False
            
            # Simple equality check
            elif key not in metadata or metadata[key] != value:
                return False
                
        # All criteria matched
        return True
    
    def save(self) -> None:
        """Save the vector store to disk"""
        if not self.initialized:
            logger.warning("Vector store not initialized, cannot save")
            return
        
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            
            # Save metadata
            with open(f"{self.index_path}.metadata", 'wb') as f:
                pickle.dump(self.metadata, f)
            
            # Save index
            if FAISS_AVAILABLE:
                faiss.write_index(self.index, f"{self.index_path}.index")
            else:
                with open(f"{self.index_path}.index", 'wb') as f:
                    pickle.dump(self.index, f)
            
            # Reset modified flag
            self.modified_since_save = False
            
            logger.info(f"Saved vector store with {len(self.metadata)} vectors")
        except Exception as e:
            logger.error(f"Failed to save vector store: {str(e)}")
    
    def clear(self) -> None:
        """Clear the vector store"""
        self._initialize_new_index()
        logger.info("Cleared vector store")
        # Save immediately after clearing
        self.save()
        
    def get_all_data(self) -> List[Dict[str, Any]]:
        """Retrieve all metadata stored in the vector store
        
        Returns:
            List of all metadata entries
        """
        if not self.initialized:
            logger.warning("Vector store not initialized")
            return []
        
        if len(self.metadata) == 0:
            logger.warning("Vector store is empty")
            return []
        
        return self.metadata
        
    def _setup_auto_save(self) -> None:
        """Set up the auto-save background thread"""
        def auto_save_worker():
            """Background worker function to periodically save the vector store"""
            while not self.shutting_down:
                # Sleep for the specified interval
                for _ in range(self.auto_save_interval):
                    if self.shutting_down:
                        break
                    time.sleep(1)
                
                # Skip if shutting down or not modified
                if self.shutting_down or not self.modified_since_save:
                    continue
                
                try:
                    # Save the vector store
                    self.save()
                    self.modified_since_save = False
                    logger.debug("Auto-saved vector store")
                except Exception as e:
                    logger.error(f"Error during auto-save: {str(e)}")
        
        # Start the auto-save thread
        self.auto_save_thread = threading.Thread(target=auto_save_worker, daemon=True)
        self.auto_save_thread.start()
        logger.info(f"Started auto-save thread with interval {self.auto_save_interval} seconds")
    
    def _shutdown_handler(self) -> None:
        """Handle application shutdown by saving vector store"""
        if self.shutting_down:
            return  # Prevent multiple calls
            
        self.shutting_down = True
        logger.info("Vector store shutting down, saving data...")
        
        if self.modified_since_save:
            try:
                self.save()
                logger.info("Vector store saved successfully on shutdown")
            except Exception as e:
                logger.error(f"Failed to save vector store on shutdown: {str(e)}")
