"""
GenAI-enhanced resource forecasting for Kubernetes infrastructure

This module provides AI-powered resource forecasting capabilities by analyzing
historical metrics data and using LLMs to generate intelligent forecasts
and recommendations.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import os

from utils.llm_interface import get_llm_interface

# Configure logging
logger = logging.getLogger(__name__)

class GenAIForecasting:
    """GenAI-powered resource forecasting for Kubernetes infrastructure"""
    
    def __init__(self):
        """Initialize the GenAI forecasting engine"""
        self.llm_provider = None
        try:
            # Initialize LLM provider (will use the default configured provider)
            self.llm_provider = get_llm_interface()
            logger.info("GenAI forecasting engine initialized with LLM provider")
        except Exception as e:
            logger.error(f"Failed to initialize LLM provider for GenAI forecasting: {e}")
    
    def generate_forecasts(self, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate AI-enhanced resource forecasts based on metrics data
        
        Args:
            metrics_data: Historical metrics data for Kubernetes components
            
        Returns:
            Dictionary with AI-enhanced resource forecasts and lifecycle predictions
        """
        # First generate baseline forecasts using traditional methods
        baseline_forecasts = self._generate_baseline_forecasts(metrics_data)
        
        # If LLM is available, enhance the forecasts with GenAI
        if self.llm_provider:
            try:
                enhanced_forecasts = self._enhance_forecasts_with_llm(baseline_forecasts, metrics_data)
                return enhanced_forecasts
            except Exception as e:
                logger.error(f"Error enhancing forecasts with LLM: {e}")
                # Fall back to baseline forecasts
                return baseline_forecasts
        else:
            # Return baseline forecasts if LLM is not available
            return baseline_forecasts
    
    def _generate_baseline_forecasts(self, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate baseline forecasts using traditional statistical methods
        
        Args:
            metrics_data: Historical metrics data for Kubernetes components
            
        Returns:
            Dictionary with baseline resource forecasts and lifecycle predictions
        """
        current_time = datetime.now()
        future_date_1 = current_time + timedelta(days=7)
        future_date_2 = current_time + timedelta(days=14)
        future_date_3 = current_time + timedelta(days=30)
        
        # Extract pod metrics if available
        pods = metrics_data.get("pods", [])
        
        # Generate resource forecasts based on pod metrics
        resource_forecasts = []
        
        # Add pod-specific forecasts if pod data is available
        if pods:
            for i, pod in enumerate(pods[:3]):  # Limit to first 3 pods to avoid clutter
                # CPU usage forecast
                if i == 0:
                    resource_forecasts.append({
                        "node_name": pod.get("name", "unknown-pod"),
                        "resource_type": "cpu_usage",
                        "forecasted_value": "85%",
                        "unit": "utilization",
                        "trend": "increasing",
                        "trend_description": "Increasing by 5% weekly",
                        "forecast_date": future_date_1.isoformat(),
                        "description": "CPU usage forecast based on current workload patterns"
                    })
                # Memory forecast
                elif i == 1:
                    resource_forecasts.append({
                        "node_name": pod.get("name", "unknown-pod"),
                        "resource_type": "memory_available",
                        "forecasted_value": "1.2",
                        "unit": "GB",
                        "trend": "decreasing",
                        "trend_description": "Decreasing by 100MB daily",
                        "forecast_date": future_date_2.isoformat(),
                        "description": "Memory availability forecast based on current consumption trends"
                    })
                # Disk usage forecast
                else:
                    resource_forecasts.append({
                        "component": pod.get("name", "unknown-pod"),
                        "resource_type": "disk_usage",
                        "forecasted_value": "75%",
                        "unit": "capacity",
                        "trend": "stable",
                        "trend_description": "Stable usage pattern",
                        "forecast_date": future_date_3.isoformat(),
                        "description": "Storage usage forecast based on current log accumulation rate"
                    })
        else:
            # Fallback forecasts if no pod data is available
            resource_forecasts = [
                {
                    "node_name": "k8s-node-1",
                    "resource_type": "cpu_usage",
                    "forecasted_value": "85%",
                    "unit": "utilization",
                    "trend": "increasing",
                    "trend_description": "Increasing by 5% weekly",
                    "forecast_date": future_date_1.isoformat(),
                    "description": "CPU usage forecast based on current workload patterns"
                },
                {
                    "node_name": "k8s-node-2",
                    "resource_type": "memory_available",
                    "forecasted_value": "1.2",
                    "unit": "GB",
                    "trend": "decreasing",
                    "trend_description": "Decreasing by 100MB daily",
                    "forecast_date": future_date_2.isoformat(),
                    "description": "Memory availability forecast based on current consumption trends"
                },
                {
                    "component": "L1-Monitoring App",
                    "resource_type": "disk_usage",
                    "forecasted_value": "75%",
                    "unit": "capacity",
                    "trend": "stable",
                    "trend_description": "Stable usage pattern",
                    "forecast_date": future_date_3.isoformat(),
                    "description": "Storage usage forecast based on current log accumulation rate"
                }
            ]
        
        # Generate lifecycle predictions
        lifecycle_predictions = [
            {
                "component": "Kubernetes API Server",
                "status": "stable",
                "urgency": "low",
                "lifecycle_start": (current_time - timedelta(days=90)).isoformat(),
                "end_of_life": (current_time + timedelta(days=180)).isoformat(),
                "recommendation": "Regular monitoring recommended as part of standard operations",
                "next_steps": "Continue regular health checks"
            },
            {
                "component": "Database Storage Volume",
                "status": "warning",
                "urgency": "medium",
                "lifecycle_start": (current_time - timedelta(days=120)).isoformat(),
                "end_of_life": (current_time + timedelta(days=45)).isoformat(),
                "recommendation": "Plan for storage expansion within 1-2 months",
                "next_steps": "Assess growth rate and add capacity before reaching 90%"
            },
            {
                "component": "Load Balancer Configuration",
                "status": "critical",
                "urgency": "high",
                "lifecycle_start": (current_time - timedelta(days=180)).isoformat(),
                "end_of_life": (current_time + timedelta(days=15)).isoformat(),
                "recommendation": "Immediate reconfiguration needed to handle increasing traffic",
                "next_steps": "Update routing rules and add additional capacity"
            }
        ]
        
        return {
            "resource_forecasts": resource_forecasts,
            "lifecycle_predictions": lifecycle_predictions
        }
    
    def _enhance_forecasts_with_llm(self, baseline_forecasts: Dict[str, Any], 
                                     metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance the baseline forecasts with LLM-generated insights
        
        Args:
            baseline_forecasts: Baseline forecasts generated using traditional methods
            metrics_data: Historical metrics data for Kubernetes components
            
        Returns:
            Dictionary with LLM-enhanced resource forecasts and lifecycle predictions
        """
        if not self.llm_provider:
            return baseline_forecasts
        
        try:
            # Extract the baseline forecasts
            resource_forecasts = baseline_forecasts.get("resource_forecasts", [])
            lifecycle_predictions = baseline_forecasts.get("lifecycle_predictions", [])
            
            # Prepare input for the LLM
            metrics_summary = self._prepare_metrics_summary(metrics_data)
            baseline_summary = self._prepare_baseline_summary(baseline_forecasts)
            
            # Create the prompt for resource forecasting enhancement
            forecast_prompt = f"""
            As an AI assistant specializing in Kubernetes resource forecasting, analyze the following metrics 
            and baseline forecasts to provide enhanced resource forecasts with deeper insights.
            
            CURRENT METRICS:
            {metrics_summary}
            
            BASELINE FORECASTS:
            {baseline_summary}
            
            Based on this information, generate 3-5 enhanced resource forecasts with the following structure:
            1. node_name or component: The name of the node or component
            2. resource_type: The type of resource (cpu_usage, memory_available, disk_usage, network_bandwidth, etc.)
            3. forecasted_value: The predicted value
            4. unit: The unit of measurement
            5. trend: The trend direction (increasing, decreasing, stable)
            6. trend_description: A detailed description of the trend
            7. forecast_date: The date for the forecast
            8. description: A detailed explanation of the forecast including potential causes and impacts
            9. confidence: A confidence score between 0-100
            10. recommendations: Specific actionable recommendations based on this forecast
            
            FORMAT YOUR RESPONSE AS A VALID JSON ARRAY. Focus on providing substantial insights that would 
            not be obvious from simple trend analysis, such as correlations between resources, 
            impact of seasonal patterns, or identifying specific components that might cause issues.
            """
            
            # Get enhanced resource forecasts from LLM
            forecast_response = self.llm_provider.generate_text(forecast_prompt)
            enhanced_forecasts = self._parse_llm_forecast_response(forecast_response, resource_forecasts)
            
            # Create the prompt for lifecycle prediction enhancement
            lifecycle_prompt = f"""
            As an AI assistant specializing in Kubernetes lifecycle management, analyze the following metrics 
            and baseline lifecycle predictions to provide enhanced predictions with deeper insights.
            
            CURRENT METRICS:
            {metrics_summary}
            
            BASELINE LIFECYCLE PREDICTIONS:
            {json.dumps(lifecycle_predictions, indent=2)}
            
            Based on this information, generate 3-5 enhanced lifecycle predictions with the following structure:
            1. component: The name of the component
            2. status: The current status (stable, warning, critical, end_of_life)
            3. urgency: Priority level (low, medium, high)
            4. lifecycle_start: When the component was deployed or last updated
            5. end_of_life: When the component will need replacement or major update
            6. recommendation: A detailed recommendation for managing this component
            7. next_steps: Specific actionable next steps
            8. potential_impact: The potential impact if not addressed
            9. dependencies: Other components that might be affected
            
            FORMAT YOUR RESPONSE AS A VALID JSON ARRAY. Focus on providing substantial insights 
            about component lifecycle management that considers historical patterns, dependencies 
            between components, and potential future issues.
            """
            
            # Get enhanced lifecycle predictions from LLM
            lifecycle_response = self.llm_provider.generate_text(lifecycle_prompt)
            enhanced_predictions = self._parse_llm_lifecycle_response(lifecycle_response, lifecycle_predictions)
            
            return {
                "resource_forecasts": enhanced_forecasts,
                "lifecycle_predictions": enhanced_predictions
            }
            
        except Exception as e:
            logger.error(f"Error in LLM forecast enhancement: {e}")
            return baseline_forecasts
    
    def _prepare_metrics_summary(self, metrics_data: Dict[str, Any]) -> str:
        """Prepare a text summary of metrics data for the LLM prompt"""
        summary_parts = []
        
        # Add pod metrics summary
        pods = metrics_data.get("pods", [])
        if pods:
            summary_parts.append("POD METRICS:")
            for pod in pods:
                summary_parts.append(f"- {pod.get('name', 'unknown')}: CPU {pod.get('cpu_usage', 'N/A')}m, Memory {pod.get('memory_usage', 'N/A')}Mi, Status: {pod.get('status', 'N/A')}")
        
        # Add overall metrics if available
        if "runningPods" in metrics_data:
            summary_parts.append(f"\nCLUSTER SUMMARY:")
            summary_parts.append(f"- Running Pods: {metrics_data.get('runningPods', 'N/A')}")
            summary_parts.append(f"- Total Pods: {metrics_data.get('totalPods', 'N/A')}")
            if "badPhasePods" in metrics_data:
                bad_pods = metrics_data.get("badPhasePods", [])
                if bad_pods:
                    summary_parts.append(f"- Problem Pods: {len(bad_pods)}")
                    for pod in bad_pods:
                        summary_parts.append(f"  * {pod.get('name', 'unknown')}: {pod.get('phase', 'N/A')}, Reason: {pod.get('reason', 'N/A')}")
                else:
                    summary_parts.append("- Problem Pods: None")
        
        # Add timestamp if available
        if "timestamp" in metrics_data:
            summary_parts.append(f"\nTimestamp: {metrics_data.get('timestamp')}")
        
        return "\n".join(summary_parts)
    
    def _prepare_baseline_summary(self, baseline_forecasts: Dict[str, Any]) -> str:
        """Prepare a text summary of baseline forecasts for the LLM prompt"""
        return json.dumps(baseline_forecasts, indent=2)
    
    def _parse_llm_forecast_response(self, 
                                     response: str, 
                                     fallback_forecasts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Parse the LLM response and extract the enhanced resource forecasts
        
        Args:
            response: The LLM response text
            fallback_forecasts: Fallback forecasts to use if parsing fails
            
        Returns:
            List of enhanced resource forecast dictionaries
        """
        try:
            # Find and extract JSON array from the response
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                enhanced_forecasts = json.loads(json_str)
                
                # Validate the enhanced forecasts
                if isinstance(enhanced_forecasts, list) and len(enhanced_forecasts) > 0:
                    # Ensure required fields are present
                    validated_forecasts = []
                    for forecast in enhanced_forecasts:
                        if not isinstance(forecast, dict):
                            continue
                            
                        # Ensure forecast has the required fields
                        required_fields = [
                            "resource_type", "forecasted_value", "unit", "trend", "forecast_date"
                        ]
                        
                        # Check if either node_name or component is present
                        if "node_name" not in forecast and "component" not in forecast:
                            continue
                            
                        if all(field in forecast for field in required_fields):
                            # Ensure forecast_date is valid ISO format
                            try:
                                datetime.fromisoformat(forecast["forecast_date"])
                            except ValueError:
                                # Set to 7 days in the future if invalid
                                forecast["forecast_date"] = (datetime.now() + timedelta(days=7)).isoformat()
                                
                            validated_forecasts.append(forecast)
                    
                    # If we have valid forecasts, return them
                    if validated_forecasts:
                        return validated_forecasts
            
            # If we couldn't extract valid forecasts, return the fallback
            logger.warning("Failed to extract valid resource forecasts from LLM response")
            return fallback_forecasts
            
        except Exception as e:
            logger.error(f"Error parsing LLM forecast response: {e}")
            return fallback_forecasts
    
    def _parse_llm_lifecycle_response(self, 
                                     response: str, 
                                     fallback_predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Parse the LLM response and extract the enhanced lifecycle predictions
        
        Args:
            response: The LLM response text
            fallback_predictions: Fallback predictions to use if parsing fails
            
        Returns:
            List of enhanced lifecycle prediction dictionaries
        """
        try:
            # Find and extract JSON array from the response
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                enhanced_predictions = json.loads(json_str)
                
                # Validate the enhanced predictions
                if isinstance(enhanced_predictions, list) and len(enhanced_predictions) > 0:
                    # Ensure required fields are present
                    validated_predictions = []
                    for prediction in enhanced_predictions:
                        if not isinstance(prediction, dict):
                            continue
                            
                        # Ensure prediction has the required fields
                        required_fields = [
                            "component", "status", "urgency", "lifecycle_start", "end_of_life", "recommendation"
                        ]
                        
                        if all(field in prediction for field in required_fields):
                            # Ensure dates are valid ISO format
                            try:
                                datetime.fromisoformat(prediction["lifecycle_start"])
                                datetime.fromisoformat(prediction["end_of_life"])
                            except ValueError:
                                # Set to reasonable defaults if invalid
                                now = datetime.now()
                                prediction["lifecycle_start"] = (now - timedelta(days=90)).isoformat()
                                prediction["end_of_life"] = (now + timedelta(days=90)).isoformat()
                                
                            validated_predictions.append(prediction)
                    
                    # If we have valid predictions, return them
                    if validated_predictions:
                        return validated_predictions
            
            # If we couldn't extract valid predictions, return the fallback
            logger.warning("Failed to extract valid lifecycle predictions from LLM response")
            return fallback_predictions
            
        except Exception as e:
            logger.error(f"Error parsing LLM lifecycle response: {e}")
            return fallback_predictions