"""
Data ingestion API endpoint definition.
This module provides a Flask Blueprint with endpoints for managing data ingestion jobs.
"""
import os
import uuid
import logging
import json
from typing import Dict, Any, Optional, List

# Import Flask
from flask import Blueprint, request, jsonify, current_app

# Import scheduler
from utils.scheduler import get_scheduler, DataIngestionScheduler

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
ingestion_api = Blueprint('ingestion_api', __name__)

# Get scheduler
scheduler = None

def init_scheduler():
    """Initialize the scheduler."""
    global scheduler
    scheduler = get_scheduler()
    return scheduler

@ingestion_api.route('/api/ingestion/status', methods=['GET'])
def get_ingestion_status():
    """Get the status of the ingestion system."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    status = {
        "is_healthy": scheduler.is_healthy(),
        "nifi_available": scheduler.is_nifi_available(),
        "mock_mode": scheduler.mock_mode
    }
    
    return jsonify(status)

@ingestion_api.route('/api/ingestion/jobs', methods=['GET'])
def list_ingestion_jobs():
    """List all ingestion jobs."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    result = scheduler.list_jobs()
    return jsonify(result)

@ingestion_api.route('/api/ingestion/jobs/<job_id>', methods=['GET'])
def get_ingestion_job(job_id):
    """Get details for a specific ingestion job."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    result = scheduler.get_job_details(job_id)
    return jsonify(result)

@ingestion_api.route('/api/ingestion/jobs', methods=['POST'])
def create_ingestion_job():
    """Create a new ingestion job."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    data = request.json
    if not data:
        return jsonify({
            "status": "error",
            "message": "Missing request body"
        }), 400
        
    # Validate required fields
    job_type = data.get('job_type')
    if not job_type:
        return jsonify({
            "status": "error",
            "message": "Missing required field: job_type"
        }), 400
        
    # Generate job ID if not provided
    job_id = data.get('job_id', str(uuid.uuid4()))
    
    # Handle different job types
    if job_type == 'sftp':
        # Check required fields for SFTP job
        required_fields = ['remote_host', 'remote_port', 'remote_username', 'remote_password', 'remote_directory']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        
        if missing_fields:
            return jsonify({
                "status": "error",
                "message": f"Missing required fields for SFTP job: {', '.join(missing_fields)}"
            }), 400
            
        # Create SFTP job
        result = scheduler.setup_sftp_ingestion(
            job_id=job_id,
            remote_host=data['remote_host'],
            remote_port=int(data.get('remote_port', 22)),
            remote_username=data['remote_username'],
            remote_password=data['remote_password'],
            remote_directory=data['remote_directory'],
            local_directory=data.get('local_directory'),
            file_filter=data.get('file_filter', "*.*"),
            schedule_type=data.get('schedule_type', 'interval'),
            schedule_value=data.get('schedule_value', '30 minutes')
        )
        
        return jsonify(result)
        
    elif job_type == 'http':
        # Check required fields for HTTP job
        if 'api_url' not in data or not data['api_url']:
            return jsonify({
                "status": "error",
                "message": "Missing required field for HTTP job: api_url"
            }), 400
            
        # Create HTTP job
        result = scheduler.setup_http_ingestion(
            job_id=job_id,
            api_url=data['api_url'],
            http_method=data.get('http_method', 'GET'),
            headers=data.get('headers'),
            auth_username=data.get('auth_username'),
            auth_password=data.get('auth_password'),
            local_directory=data.get('local_directory'),
            data_type=data.get('data_type', 'metrics'),
            schedule_type=data.get('schedule_type', 'interval'),
            schedule_value=data.get('schedule_value', '15 minutes')
        )
        
        return jsonify(result)
    else:
        return jsonify({
            "status": "error",
            "message": f"Unsupported job type: {job_type}"
        }), 400

@ingestion_api.route('/api/ingestion/jobs/<job_id>/pause', methods=['POST'])
def pause_ingestion_job(job_id):
    """Pause a specific ingestion job."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    result = scheduler.pause_job(job_id)
    return jsonify(result)

@ingestion_api.route('/api/ingestion/jobs/<job_id>/resume', methods=['POST'])
def resume_ingestion_job(job_id):
    """Resume a specific ingestion job."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    result = scheduler.resume_job(job_id)
    return jsonify(result)

@ingestion_api.route('/api/ingestion/jobs/<job_id>', methods=['DELETE'])
def delete_ingestion_job(job_id):
    """Delete a specific ingestion job."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    result = scheduler.remove_job(job_id)
    return jsonify(result)

@ingestion_api.route('/api/ingestion/jobs/<job_id>/files', methods=['GET'])
def list_ingestion_files(job_id):
    """List files ingested by a specific job."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    # Get job details
    job_details = scheduler.get_job_details(job_id)
    if job_details.get('status') != 'success':
        return jsonify(job_details)
        
    job = job_details.get('job', {})
    
    # Get directory path
    directory = job.get('output_directory', job.get('local_directory'))
    if not directory:
        return jsonify({
            "status": "error",
            "message": "No directory associated with this job"
        }), 400
        
    # Check if directory exists
    if not os.path.exists(directory):
        return jsonify({
            "status": "error",
            "message": f"Directory {directory} does not exist"
        }), 404
        
    # Get list of files in directory
    files = []
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            files.append({
                "name": filename,
                "path": filepath,
                "size": os.path.getsize(filepath),
                "created": os.path.getctime(filepath),
                "modified": os.path.getmtime(filepath)
            })
            
    return jsonify({
        "status": "success",
        "job_id": job_id,
        "directory": directory,
        "file_count": len(files),
        "files": files
    })

@ingestion_api.route('/api/ingestion/jobs/<job_id>/files/<path:filename>', methods=['GET'])
def get_ingestion_file(job_id, filename):
    """Get the content of a specific ingested file."""
    global scheduler
    if not scheduler:
        scheduler = init_scheduler()
        
    # Get job details
    job_details = scheduler.get_job_details(job_id)
    if job_details.get('status') != 'success':
        return jsonify(job_details)
        
    job = job_details.get('job', {})
    
    # Get directory path
    directory = job.get('output_directory', job.get('local_directory'))
    if not directory:
        return jsonify({
            "status": "error",
            "message": "No directory associated with this job"
        }), 400
        
    # Build file path
    filepath = os.path.join(directory, filename)
    
    # Check if file exists
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        return jsonify({
            "status": "error",
            "message": f"File {filename} does not exist"
        }), 404
        
    # Read file content
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            
        # Try to parse as JSON
        try:
            content_json = json.loads(content)
            return jsonify({
                "status": "success",
                "job_id": job_id,
                "filename": filename,
                "content_type": "json",
                "content": content_json
            })
        except json.JSONDecodeError:
            # Return as text
            return jsonify({
                "status": "success",
                "job_id": job_id,
                "filename": filename,
                "content_type": "text",
                "content": content
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error reading file: {str(e)}"
        }), 500

@ingestion_api.route('/api/ingestion/process-directory', methods=['POST'])
def process_ingestion_directory():
    """Process all files in a directory using the ingestion processor."""
    data = request.json
    if not data:
        return jsonify({
            "status": "error",
            "message": "Missing request body"
        }), 400
        
    # Validate required fields
    directory = data.get('directory')
    if not directory:
        return jsonify({
            "status": "error",
            "message": "Missing required field: directory"
        }), 400
        
    # Get data type
    data_type = data.get('data_type', 'telecom_logs')
    
    # Get ingestion processor
    try:
        from utils.ingestion_processor import get_ingestion_processor
        from utils.telecom_integration import TelecomIntegration
        from utils.ml_anomaly_detector import get_anomaly_detector
        
        # Get telecom processor and anomaly detector
        telecom_integration = TelecomIntegration()
        telecom_processor = telecom_integration.get_processor()
        anomaly_detector = get_anomaly_detector()
        
        # Get ingestion processor
        processor = get_ingestion_processor(
            telecom_processor=telecom_processor,
            anomaly_detector=anomaly_detector
        )
        
        # Process directory
        result = processor.process_ingestion_directory(directory, data_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error processing directory: {str(e)}"
        }), 500

def register_ingestion_api_blueprint(app):
    """Register the ingestion API blueprint with the Flask app."""
    app.register_blueprint(ingestion_api)
    return app