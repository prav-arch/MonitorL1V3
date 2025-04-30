"""
Machine Learning-based anomaly detection for log entries.
This module provides functionality to detect anomalies in log data using ML techniques.
"""

import numpy as np
from collections import Counter
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Dict, Any, Tuple, Optional

# Import models
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import LogEntry


class MLAnomalyDetector:
    """ML-based anomaly detection for logs using Isolation Forest and TF-IDF vectorization"""
    
    def __init__(self, contamination: float = 0.05):
        """Initialize the ML-based anomaly detector
        
        Args:
            contamination: The expected proportion of anomalies in the dataset (default: 0.05)
        """
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        self.isolation_forest = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
            n_jobs=-1
        )
        
        self.model_trained = False
        self.log_cache = []
        self.min_training_samples = 20  # Minimum number of logs needed for training
    
    def is_trained(self) -> bool:
        """Check if the model is trained"""
        return self.model_trained
    
    def add_to_cache(self, logs: List[Dict[str, Any]]) -> None:
        """Add logs to the training cache
        
        Args:
            logs: List of log dictionaries
        """
        # Only cache a reasonable amount to prevent memory issues
        max_cache_size = 5000
        self.log_cache.extend(logs[:max_cache_size - len(self.log_cache)])
        
        # If we have enough samples, train the model
        if len(self.log_cache) >= self.min_training_samples and not self.model_trained:
            self.train_model()
    
    def train_model(self) -> None:
        """Train the isolation forest model on cached logs"""
        if len(self.log_cache) < self.min_training_samples:
            return
        
        # Extract log messages for vectorization
        log_messages = [log.get('message', '') for log in self.log_cache if log.get('message')]
        
        # Vectorize the log messages
        try:
            X = self.vectorizer.fit_transform(log_messages)
            
            # Train isolation forest
            self.isolation_forest.fit(X)
            self.model_trained = True
            print(f"Trained ML anomaly detector on {len(log_messages)} logs")
        except Exception as e:
            print(f"Error training ML anomaly detector: {e}")
    
    def detect_anomalies(self, logs: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], float]]:
        """Detect anomalies in a list of logs
        
        Args:
            logs: List of log dictionaries
        
        Returns:
            List of tuples (log, anomaly_score) with anomaly scores
        """
        # Add these logs to cache for potential future training
        self.add_to_cache(logs)
        
        # If model is not trained, return empty results
        if not self.model_trained:
            return [(log, 0.0) for log in logs]
        
        log_messages = [log.get('message', '') for log in logs if log.get('message')]
        if not log_messages:
            return [(log, 0.0) for log in logs]
        
        try:
            # Transform log messages using the trained vectorizer
            X = self.vectorizer.transform(log_messages)
            
            # Predict anomaly scores (negative values are more anomalous)
            scores = self.isolation_forest.decision_function(X)
            
            # Convert scores to anomaly probability (0 = normal, 1 = very anomalous)
            # Scores are typically negative for anomalies, so we invert and normalize
            normalized_scores = 1 - (scores + 1) / 2 
            
            # Return logs with their anomaly scores
            return list(zip(logs, normalized_scores))
        except Exception as e:
            print(f"Error detecting anomalies with ML: {e}")
            return [(log, 0.0) for log in logs]
    
    def detect_anomalies_from_entries(self, log_entries: List[LogEntry]) -> List[Tuple[LogEntry, float]]:
        """Detect anomalies in a list of LogEntry objects
        
        Args:
            log_entries: List of LogEntry objects
        
        Returns:
            List of tuples (log_entry, anomaly_score) with anomaly scores
        """
        # Convert LogEntry objects to dicts
        log_dicts = [entry.to_dict() for entry in log_entries]
        
        # Detect anomalies
        anomaly_results = self.detect_anomalies(log_dicts)
        
        # Map back to LogEntry objects
        return list(zip(log_entries, [score for _, score in anomaly_results]))
    
    def extract_anomaly_patterns(self, anomalous_logs: List[Dict[str, Any]], 
                                 threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Extract common patterns from anomalous logs for explanation
        
        Args:
            anomalous_logs: List of logs detected as anomalous
            threshold: Anomaly score threshold to consider (default: 0.7)
        
        Returns:
            List of pattern dictionaries with explanation
        """
        if not anomalous_logs:
            return []
        
        # Extract key terms from anomalous logs
        anomaly_messages = [log.get('message', '') for log in anomalous_logs]
        
        # Use TF-IDF to identify important terms in anomalous logs
        tfidf = TfidfVectorizer(max_features=20, stop_words='english')
        tfidf_matrix = tfidf.fit_transform(anomaly_messages)
        
        # Get feature names and calculate average TF-IDF score for each term
        feature_names = tfidf.get_feature_names_out()
        feature_scores = np.mean(tfidf_matrix.toarray(), axis=0)
        
        # Find top terms by TF-IDF score
        top_indices = feature_scores.argsort()[-10:][::-1]
        top_terms = [(feature_names[i], feature_scores[i]) for i in top_indices if feature_scores[i] > 0.1]
        
        # Analyze log levels
        log_levels = [log.get('level', '').upper() for log in anomalous_logs]
        level_counter = Counter(log_levels)
        
        # Analyze services
        services = [log.get('service', 'unknown') for log in anomalous_logs]
        service_counter = Counter(services)
        
        # Create patterns and explanations
        patterns = []
        
        # Pattern based on terms
        if top_terms:
            patterns.append({
                'type': 'keyword_pattern',
                'explanation': f"Unusual frequency of terms: {', '.join([term for term, _ in top_terms[:5]])}",
                'terms': top_terms,
                'confidence': 0.8
            })
        
        # Pattern based on log levels
        if level_counter.get('ERROR', 0) > len(anomalous_logs) * 0.3:
            patterns.append({
                'type': 'error_frequency',
                'explanation': f"High frequency of ERROR logs ({level_counter.get('ERROR', 0)} out of {len(anomalous_logs)})",
                'confidence': 0.9
            })
        
        # Pattern based on services
        top_services = service_counter.most_common(2)
        if top_services and top_services[0][1] > len(anomalous_logs) * 0.5:
            patterns.append({
                'type': 'service_concentration',
                'explanation': f"Concentration of logs from service: {top_services[0][0]}",
                'confidence': 0.7
            })
        
        return patterns


# Singleton instance for global use
anomaly_detector = MLAnomalyDetector()

def get_anomaly_detector() -> MLAnomalyDetector:
    """Get the global singleton instance of the anomaly detector
    
    Returns:
        MLAnomalyDetector: The singleton anomaly detector instance
    """
    global anomaly_detector
    return anomaly_detector