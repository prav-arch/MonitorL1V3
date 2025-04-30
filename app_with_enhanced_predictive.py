def get_predictive_maintenance_analysis():
    """API endpoint to analyze Kubernetes infrastructure health and provide maintenance recommendations"""
    try:
        # Log that the endpoint was called
        logger.info("Predictive maintenance analysis endpoint called")
        
        # Check if predictive maintenance engine is available
        if maintenance_engine is None:
            logger.error("Predictive maintenance engine is None, creating mock data")
            
            # Return mock data instead of an error
            from datetime import datetime, timedelta
            current_time = datetime.now()
            
            # Create a date in the future for forecasting
            future_date_1 = current_time + timedelta(days=7)
            future_date_2 = current_time + timedelta(days=14)
            future_date_3 = current_time + timedelta(days=30)
            
            # Create dates in the past for lifecycle start dates
            past_date_1 = current_time - timedelta(days=365)  # 1 year ago
            past_date_2 = current_time - timedelta(days=730)  # 2 years ago
            past_date_3 = current_time - timedelta(days=180)  # 6 months ago
            
            # Create dates in the future for lifecycle end dates
            end_date_1 = current_time + timedelta(days=730)   # 2 years in future
            end_date_2 = current_time + timedelta(days=365)   # 1 year in future
            end_date_3 = current_time + timedelta(days=1095)  # 3 years in future
            
            mock_data = {
                "timestamp": current_time.isoformat(),
                "healthy_components": [
                    {"component": "API Server", "health_score": 95, "component_type": "control_plane"},
                    {"component": "Frontend Service", "health_score": 92, "component_type": "service"},
                    {"component": "Database Cluster", "health_score": 90, "component_type": "database"},
                    {"component": "Worker Node 1", "health_score": 94, "component_type": "node"},
                    {"component": "Worker Node 2", "health_score": 91, "component_type": "node"}
                ],
                "at_risk_components": [
                    {
                        "component": "Cache Service", 
                        "health_score": 75, 
                        "component_type": "service",
                        "estimated_failure": "7 days",
                        "failure_modes": [
                            {"type": "memory_leak", "confidence": 0.6},
                            {"type": "resource_exhaustion", "confidence": 0.5}
                        ]
                    }
                ],
                "maintenance_required": [
                    {
                        "component": "Logging Service", 
                        "health_score": 45, 
                        "component_type": "service",
                        "estimated_failure": "24 hours",
                        "failure_modes": [
                            {"type": "disk_space", "confidence": 0.8},
                            {"type": "connectivity_issues", "confidence": 0.6}
                        ]
                    }
                ],
                "recommendations": [
                    "Increase disk space allocation for Logging Service",
                    "Check network connectivity for Logging Service",
                    "Monitor memory usage for Cache Service",
                    "Consider upgrading resources for Cache Service"
                ],
                "kubernetes_health": {
                    "cluster_status": "Healthy",
                    "nodes_total": 3,
                    "pods_total": 15,
                    "last_update": current_time.isoformat()
                },
                # Add resource forecasts for the new UI section
                "resource_forecasts": [
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
                ],
                # Add lifecycle predictions for the new UI section
                "lifecycle_predictions": [
                    {
                        "component": "ClickHouse Database",
                        "status": "stable",
                        "urgency": "low",
                        "lifecycle_start": past_date_1.isoformat(),
                        "end_of_life": end_date_1.isoformat(),
                        "recommendation": "Regular performance optimization recommended to maintain optimal operation."
                    },
                    {
                        "component": "Kubernetes Control Plane",
                        "status": "warning",
                        "urgency": "medium",
                        "lifecycle_start": past_date_2.isoformat(),
                        "end_of_life": end_date_2.isoformat(),
                        "recommendation": "Consider upgrade planning within the next 6 months to avoid deprecation issues.",
                        "next_steps": "Begin compatibility testing with newer Kubernetes versions."
                    },
                    {
                        "component": "L1 Monitoring App",
                        "status": "new",
                        "urgency": "low",
                        "lifecycle_start": past_date_3.isoformat(),
                        "end_of_life": end_date_3.isoformat(),
                        "recommendation": "Recently deployed, monitoring for stability issues."
                    }
                ],
                "is_mock_data": True
            }
            return jsonify(mock_data), 200
        
        # If we have a real maintenance engine, fetch the analysis
        analysis_result = maintenance_engine.perform_analysis()
        
        # Convert datetime objects to strings
        if isinstance(analysis_result, dict):
            for key, value in analysis_result.items():
                if isinstance(value, datetime):
                    analysis_result[key] = value.isoformat()
            
            # Ensure we mark whether this is mock data
            if "is_mock_data" not in analysis_result:
                analysis_result["is_mock_data"] = maintenance_engine.is_mock_mode()
                
        return jsonify(analysis_result), 200
    
    except Exception as e:
        logger.error(f"Error in predictive maintenance analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500