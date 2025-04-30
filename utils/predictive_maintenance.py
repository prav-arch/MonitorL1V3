"""
Predictive Maintenance for Kubernetes Infrastructure

This module provides predictive maintenance capabilities by analyzing log data
and Kubernetes performance metrics to identify potential infrastructure failures 
before they occur and suggest proactive maintenance.
"""

import logging
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from models import LogEntry

# Configure logging
logger = logging.getLogger(__name__)

# Define Kubernetes component types and common failures
EQUIPMENT_TYPES = {
    "control_plane": ["etcd", "api-server", "controller-manager", "scheduler", "cloud-controller-manager"],
    "nodes": ["kubelet", "kube-proxy", "container-runtime", "node-problem-detector"],
    "storage": ["persistent-volume", "storage-class", "csi-driver", "volume-attachment"],
    "networking": ["ingress-controller", "service-mesh", "cni-plugin", "network-policy-controller"],
    "workloads": ["deployment", "statefulset", "daemonset", "job", "cronjob", "pod"]
}

COMMON_FAILURE_PATTERNS = {
    "memory_pressure": ["memory exhaustion", "out of memory", "eviction", "OOMKilled", "memory allocation failed"],
    "cpu_saturation": ["cpu throttling", "high load", "cpu limits", "processing delay", "latency spike"],
    "disk_pressure": ["disk pressure", "io wait", "volume full", "no space left", "cannot write"],
    "network_issues": ["dns error", "connection refused", "timeout", "network unreachable", "TLS handshake"],
    "scheduling_problems": ["unschedulable", "pod pending", "insufficient resources", "taint", "node affinity"],
    "node_health": ["node not ready", "node condition", "kubelet not running", "node cordoned", "node unreachable"],
    "etcd_issues": ["etcd unhealthy", "leader election", "etcd split brain", "quorum lost", "etcd slow"],
    "api_server_issues": ["api-server unavailable", "too many requests", "request throttling", "admission webhook"]
}

class PredictiveMaintenanceEngine:
    """Engine for predicting equipment maintenance needs based on log analysis and performance metrics"""
    
    def __init__(self):
        """Initialize the predictive maintenance engine"""
        self.vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        self.anomaly_detector = IsolationForest(contamination=0.05, random_state=42)
        self.failure_classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.component_health = {}
        self.failure_prediction_model_trained = False
        
    def train_model(self, logs: List[LogEntry], performance_metrics: Optional[Dict[str, Any]] = None):
        """Train the predictive models using historical log data and performance metrics
        
        Args:
            logs: List of log entries for model training
            performance_metrics: Optional performance metrics data (either a dictionary or list of dictionaries)
        """
        if not logs:
            logger.warning("No logs provided for training predictive maintenance model")
            return False
            
        try:
            # Extract log messages for text-based analysis
            log_messages = [log.message for log in logs]
            
            # Vectorize log messages
            log_vectors = self.vectorizer.fit_transform(log_messages)
            
            # Train anomaly detection model
            self.anomaly_detector.fit(log_vectors)
            
            # If we have performance metrics, use them for more sophisticated modeling
            if performance_metrics and len(performance_metrics) > 0:
                # Extract numerical features from performance metrics
                numerical_features = self._extract_numerical_features(performance_metrics)
                if numerical_features.size > 0:
                    # Scale numerical features
                    scaled_features = self.scaler.fit_transform(numerical_features)
                    
                    # For demonstration, we'll create synthetic failure labels
                    # In a real implementation, you would use actual failure data
                    n_samples = numerical_features.shape[0]
                    synthetic_labels = self._create_synthetic_labels(n_samples)
                    
                    # Train classifier - ensure both arrays have the same number of samples
                    if len(synthetic_labels) == scaled_features.shape[0]:
                        self.failure_classifier.fit(scaled_features, synthetic_labels)
                        self.failure_prediction_model_trained = True
                    else:
                        logger.warning(f"Shape mismatch: features={scaled_features.shape}, labels={synthetic_labels.shape}")
                        # Create labels with the correct shape
                        corrected_labels = self._create_synthetic_labels(scaled_features.shape[0])
                        self.failure_classifier.fit(scaled_features, corrected_labels)
                        self.failure_prediction_model_trained = True
            
            self.is_trained = True
            logger.info("Predictive maintenance model trained successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error training predictive maintenance model: {e}")
            return False
            
    def analyze_equipment_health(self, 
                                logs: List[LogEntry], 
                                performance_metrics: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze Kubernetes infrastructure health and predict maintenance needs
        
        Args:
            logs: Recent log entries
            performance_metrics: Optional Kubernetes performance metrics (either a dictionary or list of dictionaries)
            
        Returns:
            Dictionary with Kubernetes component health status and maintenance recommendations
        """
        try:
            if not logs:
                logger.warning("No logs provided for equipment health analysis")
                return {
                    "healthy_components": [],
                    "at_risk_components": [],
                    "maintenance_required": [],
                    "recommendations": [],
                    "timestamp": datetime.now().isoformat()
                }
                
            # Validate logs format
            validated_logs = []
            for log in logs:
                if not isinstance(log, LogEntry):
                    logger.warning(f"Invalid log entry type: {type(log)}")
                    continue
                validated_logs.append(log)
                
            if not validated_logs:
                logger.warning("No valid log entries found after validation")
                return {
                    "healthy_components": [],
                    "at_risk_components": [],
                    "maintenance_required": [],
                    "recommendations": [],
                    "timestamp": datetime.now().isoformat()
                }
                
            try:
                # Map logs to components
                component_logs = self._map_logs_to_components(validated_logs)
                
                # Analyze component health based on logs
                component_health_status = {}
                at_risk_components = []
                maintenance_required = []
                
                for component, component_logs in component_logs.items():
                    if not component_logs:
                        continue
                        
                    try:
                        # Extract log messages
                        log_messages = [log.message for log in component_logs if log.message]
                        
                        if not log_messages:
                            logger.warning(f"No valid log messages for component {component}")
                            continue
                        
                        # Calculate health score
                        health_score = 0
                        
                        # Vectorize log messages (using transform, not fit_transform)
                        if self.is_trained:
                            try:
                                log_vectors = self.vectorizer.transform(log_messages)
                                
                                # Predict anomalies
                                anomaly_scores = self.anomaly_detector.decision_function(log_vectors)
                                anomaly_mean_score = np.mean(anomaly_scores)
                                
                                # Calculate health score (0-100)
                                # Higher anomaly scores mean more normal behavior
                                health_score = min(100, max(0, int(50 + 50 * anomaly_mean_score)))
                            except Exception as model_ex:
                                logger.warning(f"Error using trained model for {component}: {model_ex}")
                                # Fall back to rule-based scoring
                                health_score = self._calculate_rule_based_health(log_messages)
                        else:
                            # If model not trained, use rule-based scoring
                            health_score = self._calculate_rule_based_health(log_messages)
                        
                        # Store component health
                        component_health_status[component] = health_score
                        self.component_health[component] = health_score
                        
                        # Classify component status
                        if health_score < 30:
                            maintenance_required.append({
                                "component": component,
                                "health_score": health_score,
                                "urgency": "high",
                                "estimated_failure": "imminent",
                                "action": "replace",
                                "estimated_downtime": "2-4 hours"
                            })
                        elif health_score < 60:
                            at_risk_components.append({
                                "component": component,
                                "health_score": health_score,
                                "urgency": "medium",
                                "estimated_failure": "within 2 weeks",
                                "action": "maintenance",
                                "estimated_downtime": "1-2 hours"
                            })
                    except Exception as component_error:
                        logger.error(f"Error analyzing component {component}: {component_error}")
                        # Continue with next component
                
                # Generate maintenance recommendations
                try:
                    recommendations = self._generate_maintenance_recommendations(
                        maintenance_required, at_risk_components, validated_logs
                    )
                except Exception as rec_error:
                    logger.error(f"Error generating recommendations: {rec_error}")
                    recommendations = []
                
                # Generate overall health metrics
                try:
                    healthy_components = [
                        {"component": comp, "health_score": score} 
                        for comp, score in component_health_status.items() 
                        if score >= 60
                    ]
                except Exception as health_error:
                    logger.error(f"Error generating healthy components list: {health_error}")
                    healthy_components = []
                
                return {
                    "healthy_components": healthy_components,
                    "at_risk_components": at_risk_components,
                    "maintenance_required": maintenance_required,
                    "recommendations": recommendations,
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as inner_error:
                logger.error(f"Inner error in equipment health analysis: {inner_error}")
                return {
                    "healthy_components": [],
                    "at_risk_components": [],
                    "maintenance_required": [],
                    "recommendations": [],
                    "timestamp": datetime.now().isoformat(),
                    "error": f"Analysis error: {str(inner_error)}"
                }
                
        except Exception as e:
            logger.error(f"Error analyzing equipment health: {e}")
            return {
                "healthy_components": [],
                "at_risk_components": [],
                "maintenance_required": [],
                "recommendations": [],
                "timestamp": datetime.now().isoformat(),
                "error": f"Unhandled error: {str(e)}"
            }
    
    def _map_logs_to_components(self, logs: List[LogEntry]) -> Dict[str, List[LogEntry]]:
        """Map logs to specific Kubernetes components based on log content
        
        Args:
            logs: List of log entries
            
        Returns:
            Dictionary mapping component names to their associated logs
        """
        try:
            component_logs = {}
            
            for log in logs:
                try:
                    # Validate log entry
                    if not hasattr(log, 'service') or not hasattr(log, 'message'):
                        logger.warning(f"Invalid log entry format: {log}")
                        continue
                    
                    # Try to extract component from service field first
                    component = ""
                    if log.service:
                        # Check if service is a Kubernetes component directly
                        component = log.service
                    
                    if not component and log.message:
                        # If no service, try to extract Kubernetes component from message
                        try:
                            for component_type, components in EQUIPMENT_TYPES.items():
                                for comp in components:
                                    if comp.lower() in log.message.lower():
                                        component = comp
                                        break
                                if component:
                                    break
                            
                            # Special case for pods - check for pod pattern
                            if not component and ("pod/" in log.message.lower() or 
                                               "pod " in log.message.lower() or
                                               "container " in log.message.lower()):
                                component = "pod"
                            
                            # Check for node issues
                            if not component and ("node " in log.message.lower() or
                                               "kubelet" in log.message.lower() or
                                               "node/" in log.message.lower()):
                                component = "kubelet"
                                
                        except Exception as extract_error:
                            logger.warning(f"Error extracting k8s component from message: {extract_error}")
                    
                    # If still no component found, try additional Kubernetes-specific checks
                    if not component:
                        if (hasattr(log, "additional_fields") and log.additional_fields):
                            # Try to use namespace/kind/name pattern if available
                            # Convert string representation to dict if needed
                            fields = log.additional_fields
                            if isinstance(fields, str):
                                try:
                                    fields = json.loads(fields)
                                except:
                                    fields = {}
                                    
                            if isinstance(fields, dict):
                                if "kind" in fields:
                                    component = fields["kind"].lower()
                                elif "namespace" in fields:
                                    component = f"ns-{fields['namespace']}"
                        
                    # Default to unknown if no component identified
                    if not component:
                        component = "unknown"
                        
                    if component not in component_logs:
                        component_logs[component] = []
                        
                    component_logs[component].append(log)
                except Exception as log_error:
                    logger.warning(f"Error processing log entry: {log_error}")
                    continue
                
            return component_logs
        
        except Exception as e:
            logger.error(f"Error mapping logs to components: {e}")
            # Return empty dictionary rather than fail
            return {}
    
    def _calculate_rule_based_health(self, log_messages: List[str]) -> int:
        """Calculate a health score based on rule-based analysis of log messages
        
        Args:
            log_messages: List of log message strings
            
        Returns:
            Health score between 0 and 100
        """
        try:
            # Validate input
            if not log_messages:
                logger.info("No log messages provided for rule-based health calculation")
                return 80  # Default to good health if no messages
                
            # Ensure all messages are strings
            validated_messages = []
            for msg in log_messages:
                if not isinstance(msg, str):
                    logger.warning(f"Invalid log message type: {type(msg)}")
                    continue
                validated_messages.append(msg)
                
            if not validated_messages:
                logger.warning("No valid log messages for rule-based health calculation")
                return 80  # Default to good health if no valid messages
                
            # Count occurrences of failure patterns
            try:
                pattern_counts = {}
                for pattern_type, patterns in COMMON_FAILURE_PATTERNS.items():
                    pattern_counts[pattern_type] = 0
                    for pattern in patterns:
                        for message in validated_messages:
                            try:
                                if pattern.lower() in message.lower():
                                    pattern_counts[pattern_type] += 1
                            except Exception as pattern_error:
                                logger.warning(f"Error matching pattern '{pattern}': {pattern_error}")
            except Exception as pattern_count_error:
                logger.error(f"Error counting failure patterns: {pattern_count_error}")
                return 50  # Default to medium health if pattern counting fails
            
            # Calculate total matches and weight them
            total_patterns = sum(pattern_counts.values())
            total_messages = len(validated_messages)
            
            # Calculate ratio of problematic logs
            try:
                problem_ratio = min(1.0, total_patterns / total_messages)
                
                # Higher ratio means lower health
                health_score = int(100 * (1 - problem_ratio))
            except ZeroDivisionError:
                logger.warning("Zero division when calculating problem ratio")
                health_score = 80  # Default to good health in case of division error
            except Exception as ratio_error:
                logger.error(f"Error calculating problem ratio: {ratio_error}")
                health_score = 50  # Default to medium health if calculation fails
            
            # Consider pattern diversity (multiple pattern types indicate lower health)
            try:
                pattern_types_present = sum(1 for count in pattern_counts.values() if count > 0)
                if pattern_types_present > 1:
                    health_score -= 10 * pattern_types_present
            except Exception as diversity_error:
                logger.error(f"Error calculating pattern diversity: {diversity_error}")
                # Continue without applying diversity penalty
                
            # Ensure health score is within valid range
            return max(0, min(100, health_score))
            
        except Exception as e:
            logger.error(f"Error in rule-based health calculation: {e}")
            return 50  # Default to medium health in case of error
    
    def _extract_numerical_features(self, performance_metrics: Union[Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """Extract numerical features from Kubernetes performance metrics
        
        Args:
            performance_metrics: Either a dictionary or list of performance metric dictionaries
            
        Returns:
            NumPy array of numerical features
        """
        # Handle empty or None metrics
        if not performance_metrics:
            # Return a single sample with default features for empty metrics
            return np.zeros((1, 10))  # Default feature vector with 10 dimensions
            
        numerical_features = []
        
        # Handle both dictionary and list of dictionaries
        if isinstance(performance_metrics, dict):
            # Convert single dictionary to a list with one item
            metrics_list = [performance_metrics]
        elif isinstance(performance_metrics, list):
            # Already a list
            metrics_list = performance_metrics
        else:
            # Handle unexpected input type
            logger.warning(f"Unexpected performance_metrics type: {type(performance_metrics)}")
            return np.zeros((1, 10))  # Return default features
            
        # Handle empty list
        if not metrics_list:
            return np.zeros((1, 10))
            
        for metric in metrics_list:
            # Skip non-dictionary items
            if not isinstance(metric, dict):
                logger.warning(f"Skipping non-dictionary metric: {type(metric)}")
                continue
                
            # Extract numerical values from metrics
            feature_vector = []
            
            # Process top-level metrics
            for key, value in metric.items():
                if isinstance(value, (int, float)) and key != 'timestamp':
                    feature_vector.append(value)
                    
                # Also process nested dictionaries (common in Kubernetes metrics)
                elif isinstance(value, dict):
                    for nested_key, nested_value in value.items():
                        if isinstance(nested_value, (int, float)) and nested_key != 'timestamp':
                            feature_vector.append(nested_value)
            
            # Only add non-empty feature vectors
            if feature_vector:
                numerical_features.append(feature_vector)
        
        # If we have no valid features after processing, return default
        if not numerical_features:
            return np.zeros((1, 10))
            
        # Make sure all feature vectors have the same length
        max_length = max(len(vec) for vec in numerical_features)
        
        # Ensure we have at least one feature
        if max_length == 0:
            return np.zeros((len(numerical_features), 1))
            
        # Normalize feature vector lengths
        for i, vec in enumerate(numerical_features):
            if len(vec) < max_length:
                numerical_features[i] = vec + [0] * (max_length - len(vec))
        
        return np.array(numerical_features)
    
    def _create_synthetic_labels(self, n_samples: int) -> np.ndarray:
        """Create synthetic failure labels for training
        
        Note: In a real implementation, you would use actual failure data
        
        Args:
            n_samples: Number of samples
            
        Returns:
            NumPy array of binary labels (0=no failure, 1=failure)
        """
        # Handle edge cases
        if n_samples <= 0:
            return np.array([])
            
        if n_samples == 1:
            # Single sample case, return no failure by default
            return np.zeros(1)
            
        # Simple approach: assume 10% of samples represent failures
        synthetic_labels = np.zeros(n_samples)
        
        # Calculate number of failure samples
        failure_count = max(1, int(n_samples * 0.1))  # Ensure at least one failure for training
        
        # Create random indices for failures, but handle small sample sizes
        if n_samples > 1:
            failure_indices = np.random.choice(n_samples, size=min(failure_count, n_samples), replace=False)
            synthetic_labels[failure_indices] = 1
            
        return synthetic_labels
    
    def _generate_maintenance_recommendations(self, 
                                           maintenance_required: List[Dict[str, Any]],
                                           at_risk_components: List[Dict[str, Any]],
                                           logs: List[LogEntry]) -> List[Dict[str, Any]]:
        """Generate Kubernetes maintenance recommendations based on component health analysis
        
        Args:
            maintenance_required: List of components requiring immediate maintenance
            at_risk_components: List of at-risk components
            logs: Recent log entries for contextual analysis
            
        Returns:
            List of maintenance recommendations specific to Kubernetes infrastructure
        """
        recommendations = []
        
        # Process components requiring immediate maintenance
        for component_info in maintenance_required:
            component = component_info["component"]
            
            # Determine likely failure modes based on logs
            failure_modes = self._identify_failure_modes(component, logs)
            
            # Generate kubernetes-specific recommendations
            action = self._determine_k8s_action(component, component_info["health_score"])
            downtime = self._estimate_k8s_downtime(component, action)
            
            recommendation = {
                "component": component,
                "action": action,
                "urgency": "high",
                "timing": "immediate",
                "failure_modes": failure_modes,
                "justification": f"Kubernetes component health at critical level ({component_info['health_score']}%)",
                "estimated_downtime": downtime
            }
            
            recommendations.append(recommendation)
        
        # Process at-risk components
        for component_info in at_risk_components:
            component = component_info["component"]
            
            # Determine likely failure modes
            failure_modes = self._identify_failure_modes(component, logs)
            
            # Generate kubernetes-specific recommendations
            action = "monitor" if component_info["health_score"] > 40 else self._determine_k8s_action(component, component_info["health_score"])
            downtime = self._estimate_k8s_downtime(component, action)
            
            recommendation = {
                "component": component,
                "action": action,
                "urgency": "medium",
                "timing": "within 1 week",
                "failure_modes": failure_modes,
                "justification": f"Kubernetes component showing signs of degradation ({component_info['health_score']}%)",
                "estimated_downtime": downtime
            }
            
            recommendations.append(recommendation)
            
        return recommendations
        
    def _determine_k8s_action(self, component: str, health_score: int) -> str:
        """Determine appropriate maintenance action for a Kubernetes component
        
        Args:
            component: Component name
            health_score: Health score (0-100)
            
        Returns:
            Recommended action (restart, recreate, drain, etc.)
        """
        component = component.lower()
        
        # Very low health score actions
        if health_score < 20:
            if "pod" in component or "container" in component:
                return "recreate"
            elif "node" in component or "kubelet" in component:
                return "drain-and-reinstall"
            elif "volume" in component or "storage" in component:
                return "migrate-data"
            elif "etcd" in component:
                return "backup-and-restore"
            elif "api" in component:
                return "restart-in-maintenance-window"
            else:
                return "replace"
        
        # Moderate health score actions
        elif health_score < 50:
            if "pod" in component or "container" in component:
                return "restart"
            elif "node" in component or "kubelet" in component:
                return "drain-and-reboot"
            elif "deployment" in component or "statefulset" in component:
                return "rolling-restart"
            elif "etcd" in component:
                return "backup-and-maintain"
            elif "api" in component:
                return "restart-one-instance"
            else:
                return "maintenance"
        
        # Higher health score actions
        else:
            if "pod" in component or "container" in component:
                return "monitor-and-restart-if-needed"
            elif "node" in component:
                return "cordon-and-inspect"
            else:
                return "inspect"
                
    def _estimate_k8s_downtime(self, component: str, action: str) -> str:
        """Estimate downtime for a Kubernetes maintenance action
        
        Args:
            component: Component name
            action: Planned action
            
        Returns:
            Estimated downtime as a string
        """
        # High-impact actions
        if action in ["drain-and-reinstall", "migrate-data", "backup-and-restore"]:
            return "2-4 hours"
        
        # Medium-impact actions
        elif action in ["recreate", "restart-in-maintenance-window", "drain-and-reboot"]:
            return "30-60 minutes"
            
        # Low-impact actions
        elif action in ["restart", "rolling-restart", "restart-one-instance"]:
            return "5-15 minutes"
            
        # Minimal-impact actions
        elif action in ["monitor-and-restart-if-needed", "cordon-and-inspect", "inspect", "backup-and-maintain"]:
            return "0-5 minutes"
            
        # Default
        return "1 hour"
    
    def _identify_failure_modes(self, component: str, logs: List[LogEntry]) -> List[Dict[str, Any]]:
        """Identify likely failure modes for a Kubernetes component based on log messages
        
        Args:
            component: Component name (e.g., pod, etcd, kubelet)
            logs: Recent log entries
            
        Returns:
            List of likely failure modes with confidence scores
        """
        try:
            # Validate inputs
            if not component or not isinstance(component, str):
                logger.warning(f"Invalid component name: {component}")
                return [{
                    "type": "unknown",
                    "confidence": 0.5,
                    "description": "Invalid component specification"
                }]
                
            if not logs:
                logger.warning(f"No logs provided for component {component}")
                return [{
                    "type": "unknown",
                    "confidence": 0.5,
                    "description": "No log data available for analysis"
                }]
            
            # Filter logs for this component
            component_logs = []
            for log in logs:
                try:
                    if (hasattr(log, 'service') and log.service and 
                            component.lower() in log.service.lower()):
                        component_logs.append(log)
                    elif (hasattr(log, 'message') and log.message and 
                            component.lower() in log.message.lower()):
                        component_logs.append(log)
                except Exception as log_error:
                    logger.warning(f"Error processing log for component {component}: {log_error}")
            
            if not component_logs:
                logger.info(f"No relevant logs found for component {component}")
                return [{
                    "type": "unknown",
                    "confidence": 0.5,
                    "description": "Insufficient log data for detailed analysis"
                }]
            
            # Determine applicable failure types based on component
            applicable_failures = []
            
            # Map component to relevant failure categories
            if component in ["etcd", "etcd-0", "etcd-1", "etcd-2"]:
                applicable_failures = ["etcd_issues", "memory_pressure", "cpu_saturation", "disk_pressure"]
            elif component in ["api-server", "kube-apiserver"]:
                applicable_failures = ["api_server_issues", "memory_pressure", "cpu_saturation"]
            elif component in ["kubelet", "container-runtime", "node-problem-detector"]:
                applicable_failures = ["node_health", "memory_pressure", "disk_pressure"]
            elif component in ["pod", "container", "deployment", "statefulset", "daemonset", "job", "cronjob"]:
                applicable_failures = ["memory_pressure", "cpu_saturation", "scheduling_problems", "network_issues"]
            elif component in ["kube-proxy", "ingress-controller", "service-mesh", "cni-plugin"]:
                applicable_failures = ["network_issues", "node_health"]
            elif component in ["persistent-volume", "storage-class", "csi-driver", "volume-attachment"]:
                applicable_failures = ["disk_pressure", "scheduling_problems"]
            else:
                # For unknown components, check all failure patterns
                applicable_failures = list(COMMON_FAILURE_PATTERNS.keys())
            
            # Count occurrences of different failure patterns
            try:
                failure_counts = {}
                for failure_type in applicable_failures:
                    failure_counts[failure_type] = 0
                    patterns = COMMON_FAILURE_PATTERNS.get(failure_type, [])
                    for pattern in patterns:
                        for log in component_logs:
                            if not hasattr(log, 'message') or not log.message:
                                continue
                            try:
                                if pattern.lower() in log.message.lower():
                                    failure_counts[failure_type] += 1
                            except Exception as pattern_error:
                                logger.warning(f"Error matching pattern '{pattern}': {pattern_error}")
            except Exception as pattern_count_error:
                logger.error(f"Error counting failure patterns: {pattern_count_error}")
                return [{
                    "type": "unknown",
                    "confidence": 0.5,
                    "description": "Error analyzing failure patterns"
                }]
            
            # Calculate confidence scores
            total_matches = sum(failure_counts.values())
            if total_matches == 0:
                return [{
                    "type": "unknown",
                    "confidence": 0.5,
                    "description": "No specific failure patterns detected"
                }]
            
            # Convert counts to confidence scores with component-specific weighting
            failure_modes = []
            for failure_type, count in failure_counts.items():
                if count > 0:
                    try:
                        # Apply component-specific weightings
                        weight_modifier = 1.0
                        
                        # Higher weights for critical component-failure type combinations
                        if component in ["etcd", "etcd-0", "etcd-1", "etcd-2"] and failure_type == "etcd_issues":
                            weight_modifier = 1.5
                        elif component in ["api-server", "kube-apiserver"] and failure_type == "api_server_issues":
                            weight_modifier = 1.5
                        elif component in ["kubelet"] and failure_type == "node_health":
                            weight_modifier = 1.5
                        elif "pod" in component and failure_type == "memory_pressure":
                            weight_modifier = 1.3
                        
                        confidence = min(0.95, (count * weight_modifier) / total_matches)
                        if confidence > 0.15:  # Only include significant patterns
                            failure_modes.append({
                                "type": failure_type,
                                "confidence": round(confidence, 2),
                                "description": self._get_failure_description(failure_type, component)
                            })
                    except Exception as confidence_error:
                        logger.warning(f"Error calculating confidence for {failure_type}: {confidence_error}")
            
            # Sort by confidence (descending)
            try:
                failure_modes.sort(key=lambda x: x["confidence"], reverse=True)
            except Exception as sort_error:
                logger.warning(f"Error sorting failure modes: {sort_error}")
                # Don't fail if sorting fails
            
            # Return top 3 failure modes or fewer if less are available
            return failure_modes[:3] if failure_modes else [{
                "type": "unknown",
                "confidence": 0.5,
                "description": "No significant failure patterns detected"
            }]
            
        except Exception as e:
            logger.error(f"Error identifying failure modes for component {component}: {e}")
            return [{
                "type": "error",
                "confidence": 0.5,
                "description": "Error during failure mode analysis"
            }]
    
    def _get_failure_description(self, failure_type: str, component: str = "") -> str:
        """Get a human-readable description of a Kubernetes failure type
        
        Args:
            failure_type: Type of failure
            component: Optional component name for more specific descriptions
            
        Returns:
            Human-readable description
        """
        generic_descriptions = {
            "memory_pressure": "Memory resource exhaustion or excessive allocation",
            "cpu_saturation": "CPU throttling or processing resource exhaustion",
            "disk_pressure": "Storage system pressure or volume space exhaustion",
            "network_issues": "Network connectivity problems or communication failures",
            "scheduling_problems": "Pod scheduling failures or resource constraints",
            "node_health": "Node readiness or health condition issues",
            "etcd_issues": "etcd database performance or reliability problems",
            "api_server_issues": "Kubernetes API server availability or performance issues"
        }
        
        # If component is provided, give more specific descriptions
        if component:
            component = component.lower()
            
            if "etcd" in component and failure_type == "etcd_issues":
                return "etcd cluster health issues; possible split-brain, quorum loss, or excessive latency"
            elif "api" in component and failure_type == "api_server_issues":
                return "API server is experiencing high latency, request throttling, or availability issues"
            elif "kubelet" in component and failure_type == "node_health":
                return "Node agent (kubelet) is reporting unhealthy status or connection problems"
            elif ("pod" in component or "container" in component) and failure_type == "memory_pressure":
                return "Container memory limits exceeded or memory allocation pressure detected"
            elif ("pod" in component or "container" in component) and failure_type == "cpu_saturation":
                return "Container CPU throttling or excessive CPU utilization"
            elif "ingress" in component and failure_type == "network_issues":
                return "Ingress controller connectivity or routing problems detected"
            elif "volume" in component and failure_type == "disk_pressure":
                return "Persistent volume storage pressure or capacity issues"
            
        # Default to generic descriptions
        return generic_descriptions.get(failure_type, "Unknown Kubernetes failure mode")


class MaintenanceScheduler:
    """Scheduler for planning and optimizing maintenance activities"""
    
    def __init__(self):
        """Initialize the maintenance scheduler"""
        self.scheduled_maintenance = []
        self.maintenance_history = []
    
    def generate_maintenance_schedule(self, 
                                     recommendations: List[Dict[str, Any]],
                                     existing_schedule: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Generate an optimized maintenance schedule based on recommendations
        
        Args:
            recommendations: List of maintenance recommendations
            existing_schedule: Optional existing maintenance schedule
            
        Returns:
            Dictionary with optimized maintenance schedule
        """
        try:
            if not recommendations:
                return {
                    "schedule": [],
                    "total_estimated_downtime": "0 hours",
                    "generation_date": datetime.now().isoformat()
                }
            
            # Start with existing schedule or empty list
            schedule = existing_schedule or []
            
            # Current date for reference
            current_date = datetime.now()
            
            try:
                # Group recommendations by urgency
                urgent = []
                medium = []
                low = []
                
                for rec in recommendations:
                    # Validate recommendation format
                    if not isinstance(rec, dict) or "urgency" not in rec:
                        logger.warning(f"Invalid recommendation format: {rec}")
                        continue
                        
                    # Ensure required fields are present
                    if "component" not in rec or "action" not in rec or "estimated_downtime" not in rec:
                        logger.warning(f"Missing required fields in recommendation: {rec}")
                        continue
                    
                    if rec.get("urgency") == "high":
                        urgent.append(rec)
                    elif rec.get("urgency") == "medium":
                        medium.append(rec)
                    else:
                        low.append(rec)
            except Exception as group_error:
                logger.error(f"Error grouping recommendations: {group_error}")
                # Fall back to a simple approach
                urgent = [r for r in recommendations if r.get("urgency") == "high"]
                medium = [r for r in recommendations if r.get("urgency") == "medium"]
                low = [r for r in recommendations if r.get("urgency") != "high" and r.get("urgency") != "medium"]
            
            # Schedule urgent items immediately
            for item in urgent:
                try:
                    maintenance_date = current_date + timedelta(days=1)  # Schedule for tomorrow
                    
                    schedule_item = {
                        "component": item.get("component", "unknown"),
                        "action": item.get("action", "inspect"),
                        "scheduled_date": maintenance_date.strftime("%Y-%m-%d"),
                        "estimated_downtime": item.get("estimated_downtime", "1 hour"),
                        "priority": "high",
                        "technician_required": True,
                        "parts_required": item.get("action") == "replace",
                        "failure_modes": item.get("failure_modes", [])
                    }
                    
                    schedule.append(schedule_item)
                except Exception as item_error:
                    logger.error(f"Error scheduling urgent item {item}: {item_error}")
            
            # Schedule medium urgency items within the week
            for i, item in enumerate(medium):
                try:
                    # Spread medium priority items throughout the week
                    maintenance_date = current_date + timedelta(days=2 + i)
                    
                    schedule_item = {
                        "component": item.get("component", "unknown"),
                        "action": item.get("action", "inspect"),
                        "scheduled_date": maintenance_date.strftime("%Y-%m-%d"),
                        "estimated_downtime": item.get("estimated_downtime", "1 hour"),
                        "priority": "medium",
                        "technician_required": item.get("action") != "inspect",
                        "parts_required": False,
                        "failure_modes": item.get("failure_modes", [])
                    }
                    
                    schedule.append(schedule_item)
                except Exception as item_error:
                    logger.error(f"Error scheduling medium urgency item {item}: {item_error}")
            
            # Schedule low urgency items for next week
            for i, item in enumerate(low):
                try:
                    maintenance_date = current_date + timedelta(days=7 + i)
                    
                    schedule_item = {
                        "component": item.get("component", "unknown"),
                        "action": item.get("action", "inspect"),
                        "scheduled_date": maintenance_date.strftime("%Y-%m-%d"),
                        "estimated_downtime": item.get("estimated_downtime", "1 hour"),
                        "priority": "low",
                        "technician_required": False,
                        "parts_required": False,
                        "failure_modes": item.get("failure_modes", [])
                    }
                    
                    schedule.append(schedule_item)
                except Exception as item_error:
                    logger.error(f"Error scheduling low urgency item {item}: {item_error}")
            
            # Calculate total estimated downtime
            total_hours = 0
            for item in schedule:
                # Parse downtime string (e.g., "1-2 hours")
                try:
                    downtime_str = item.get("estimated_downtime", "1 hour")
                    if "-" in downtime_str:
                        hours = downtime_str.split(" ")[0].split("-")
                        total_hours += (float(hours[0]) + float(hours[1])) / 2
                    else:
                        hours = downtime_str.split(" ")[0]
                        total_hours += float(hours)
                except Exception as parse_error:
                    logger.warning(f"Error parsing downtime '{item.get('estimated_downtime')}': {parse_error}")
                    # If parsing fails, assume 1 hour
                    total_hours += 1
            
            # Format total downtime
            total_downtime = f"{total_hours:.1f} hours"
            
            return {
                "schedule": schedule,
                "total_estimated_downtime": total_downtime,
                "generation_date": current_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating maintenance schedule: {e}")
            return {
                "schedule": [],
                "total_estimated_downtime": "0 hours",
                "generation_date": datetime.now().isoformat(),
                "error": str(e)
            }

# Singleton instances
maintenance_engine = PredictiveMaintenanceEngine()
maintenance_scheduler = MaintenanceScheduler()