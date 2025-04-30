"""
API endpoints for the Kubernetes Pod Restart Agent.

This module provides a Flask Blueprint with endpoints for managing the pod restart agent.
"""

import logging
from flask import Blueprint, request, jsonify
from utils.pod_restart_agent import get_pod_restart_agent, init_pod_restart_agent

# Configure logging
logger = logging.getLogger(__name__)

# Create a Blueprint for the pod restart agent API
pod_restart_api = Blueprint('pod_restart_api', __name__)

# Initialize the agent
init_pod_restart_agent()

@pod_restart_api.route('/config', methods=['GET', 'POST'])
def agent_config():
    """
    API endpoint to get or update the pod restart agent configuration
    
    GET: Return the current configuration
    POST: Update the configuration with the provided values
    """
    agent = get_pod_restart_agent()
    
    if request.method == 'POST':
        try:
            data = request.json or {}
            
            # Update agent configuration
            if 'error_threshold' in data:
                agent.error_threshold = int(data['error_threshold'])
                
            if 'cooldown_period' in data:
                agent.cooldown_period = int(data['cooldown_period'])
                
            if 'check_interval' in data:
                agent.check_interval = int(data['check_interval'])
                
            if 'namespace' in data:
                agent.namespace = data['namespace']
                
            # Handle start/stop control
            if 'action' in data:
                if data['action'] == 'start' and not agent.running:
                    agent.start_monitoring()
                elif data['action'] == 'stop' and agent.running:
                    agent.stop_monitoring()
                elif data['action'] == 'restart' and agent.running:
                    agent.stop_monitoring()
                    agent.start_monitoring()
            
            return jsonify({
                "success": True,
                "message": "Agent configuration updated",
                "current_config": {
                    "error_threshold": agent.error_threshold,
                    "cooldown_period": agent.cooldown_period,
                    "check_interval": agent.check_interval,
                    "namespace": agent.namespace,
                    "running": agent.running,
                    "mock_mode": agent.mock_mode
                }
            })
        except Exception as e:
            logger.error(f"Error updating agent configuration: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 400
    
    # GET method returns current configuration
    return jsonify({
        "error_threshold": agent.error_threshold,
        "cooldown_period": agent.cooldown_period,
        "check_interval": agent.check_interval,
        "namespace": agent.namespace,
        "running": agent.running,
        "mock_mode": agent.mock_mode,
        "monitored_pods": len(agent.error_counts),
        "restarted_pods": len(agent.last_restart)
    })

@pod_restart_api.route('/status', methods=['GET'])
def agent_status():
    """
    API endpoint to get the status of the pod restart agent and monitored pods
    
    Query parameters:
    - pod_name: Optional specific pod to get status for
    """
    agent = get_pod_restart_agent()
    
    # Get status for a specific pod if specified
    pod_name = request.args.get('pod_name')
    
    return jsonify(agent.get_pod_status(pod_name))

@pod_restart_api.route('/restart/<pod_name>', methods=['POST'])
def restart_pod(pod_name):
    """
    API endpoint to manually restart a pod
    
    URL parameters:
    - pod_name: Name of the pod to restart
    """
    agent = get_pod_restart_agent()
    
    try:
        # Record the restart request as a manual error
        agent.record_error(
            pod_name, 
            'manual_restart_request',
            'Manual restart requested via API',
            severity=agent.error_threshold  # Force an immediate restart
        )
        
        # Attempt to restart the pod
        success = agent.restart_pod(pod_name)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Pod {pod_name} restarted successfully",
            })
        else:
            return jsonify({
                "success": False,
                "message": f"Failed to restart pod {pod_name}",
                "reason": "See server logs for details"
            }), 500
    except Exception as e:
        logger.error(f"Error restarting pod {pod_name}: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@pod_restart_api.route('/history', methods=['GET'])
def restart_history():
    """
    API endpoint to get the restart history
    
    Query parameters:
    - limit: Maximum number of entries to return (default: 10)
    - pod_name: Filter history by pod name
    """
    agent = get_pod_restart_agent()
    
    limit = int(request.args.get('limit', 10))
    pod_name = request.args.get('pod_name')
    
    history = agent.restart_history
    
    # Filter by pod name if specified
    if pod_name:
        history = [entry for entry in history if entry['pod_name'] == pod_name]
    
    # Return the most recent entries first
    recent_history = sorted(history, key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    return jsonify({
        "total_restarts": len(history),
        "filtered_restarts": len(recent_history),
        "history": recent_history
    })

def register_pod_restart_api(app):
    """
    Register the pod restart API blueprint with the Flask app
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(pod_restart_api, url_prefix='/api/pod-restart-agent')
    logger.info("Pod restart agent API endpoints registered")