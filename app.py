import os
import logging
import random
import uuid
import datetime
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS

# Load environment variables from .env file
load_dotenv()
import config
from utils.log_processor import LogProcessor
from utils.rag_engine import RAGEngine
from utils.llm_interface import get_llm_interface
from utils.vector_store import VectorStore
from utils.nifi_data_pipeline import NiFiPipeline
from utils.scheduler import get_scheduler, init_background_worker
from utils.kubernetes_monitor import get_kubernetes_monitor

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
CORS(app)

# Import database models and utilities
from database_models import DBLogEntry, get_db_session, DBTrainingData, DBFineTuningJob
from sqlalchemy import func
import db_init

# Import data ingestion API
try:
    from data_ingestion_api import register_ingestion_api_blueprint
    HAS_INGESTION_API = True
except ImportError:
    logger.warning("Data ingestion API not available")
    HAS_INGESTION_API = False
import traceback
import json
from models import LogEntry, AnalysisResult, LogStats

# Initialize database (this handles sample data as well)
db_init.initialize_database()

# Initialize components
vector_store = VectorStore(index_path=config.VECTOR_DB_PATH)
llm_interface = get_llm_interface()
log_processor = LogProcessor(embedding_model_name=config.EMBEDDING_MODEL)
rag_engine = RAGEngine(vector_store=vector_store, llm_interface=llm_interface)

# Initialize telecom components
try:
    from utils.telecom_integration import TelecomIntegration
    telecom_integration = TelecomIntegration(
        base_log_processor=log_processor,
        base_rag_engine=rag_engine
    )
    if telecom_integration.is_healthy():
        logger.info("Telecom components initialized successfully")
    else:
        logger.warning("Telecom components initialized but not healthy")
except Exception as e:
    logger.error(f"Failed to initialize telecom components: {e}")
    telecom_integration = None

# Initialize predictive maintenance components
try:
    from utils.predictive_maintenance import maintenance_engine
    if maintenance_engine is None:
        from utils.predictive_maintenance import PredictiveMaintenanceEngine
        maintenance_engine = PredictiveMaintenanceEngine()
    logger.info("Predictive maintenance components initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize predictive maintenance components: {e}")
    maintenance_engine = None

# Initialize data ingestion scheduler
try:
    data_scheduler = init_background_worker()
    logger.info("Data ingestion scheduler initialized and started")
    
    # Register data ingestion API endpoints
    if HAS_INGESTION_API:
        register_ingestion_api_blueprint(app)
        logger.info("Data ingestion API blueprint registered")
    else:
        logger.warning("Data ingestion API not available, skipping registration")
except Exception as e:
    logger.error(f"Failed to initialize data ingestion scheduler: {e}")
    data_scheduler = None

# Initialize Kubernetes monitoring
try:
    # Use mock mode in development environments
    is_dev = os.environ.get("FLASK_ENV") == "development"
    k8s_monitor = get_kubernetes_monitor(
        in_cluster=not is_dev,  # Use in-cluster config in production
        mock_mode=is_dev        # Use mock mode in development
    )
    logger.info(f"Kubernetes monitor initialized. Mock mode: {is_dev}")
except Exception as e:
    logger.error(f"Failed to initialize Kubernetes monitor: {e}")

# Initialize Pod Restart Agent
try:
    # Import the pod restart agent API
    from utils.pod_restart_api import register_pod_restart_api
    
    # Register the API endpoints
    register_pod_restart_api(app)
    
    logger.info("Pod Restart Agent API initialized")
except Exception as e:
    logger.error(f"Failed to initialize Pod Restart Agent: {e}")
    logger.warning("Pod Restart Agent will not be available")
    k8s_monitor = None

# Sample logs for fallback if database fails
SAMPLE_LOGS = db_init.SAMPLE_LOGS

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html')

@app.route('/telecom-health')
def telecom_health_dashboard():
    """Render the telecom health dashboard page"""
    return render_template('telecom_health.html')

@app.route('/ai-assistant')
def ai_assistant():
    """Render the AI Assistant page"""
    return render_template('ai_assistant.html')

@app.route('/fine-tuning')
def fine_tuning():
    """Render the Fine-Tuning dashboard page"""
    return render_template('fine_tuning.html')

@app.route('/ai-predictive-maintenance')
def ai_predictive_maintenance():
    """Render the AI Predictive Maintenance dashboard page"""
    return render_template('ai_predictive_maintenance.html')

@app.route('/data-pipeline')
def data_pipeline():
    """Render the Data Pipeline Management page"""
    return render_template('data_pipeline.html')

@app.route('/vector-search')
def vector_search_page():
    """Render the Vector Search test page"""
    return render_template('vector_search.html')

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """API endpoint to retrieve logs from database"""
    try:
        session = get_db_session()
        # Get logs from database with pagination
        limit = request.args.get('limit', default=100, type=int)
        offset = request.args.get('offset', default=0, type=int)
        level_filter = request.args.get('level', default=None)
        service_filter = request.args.get('service', default=None)
        
        # Build query
        query = session.query(DBLogEntry)
        
        # Apply filters if provided
        if level_filter:
            query = query.filter(DBLogEntry.level == level_filter)
        if service_filter:
            query = query.filter(DBLogEntry.service == service_filter)
            
        # Order by timestamp descending and apply pagination
        logs = query.order_by(DBLogEntry.timestamp.desc()).limit(limit).offset(offset).all()
        
        # Convert to dictionary
        result = [log.to_dict() for log in logs]
        
        # If no logs were found even after querying, use the sample logs
        if not result:
            logger.warning("No logs found in database, using sample logs as fallback")
            result = SAMPLE_LOGS
            
        session.close()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching logs from database: {str(e)}")
        logger.error(traceback.format_exc())
        # Fallback to sample logs if database fails
        return jsonify(SAMPLE_LOGS)

@app.route('/api/logs/upload', methods=['POST'])
def upload_logs():
    """API endpoint to upload and process log files or training documents"""
    if 'logfile' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['logfile']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Get the file extension
    filename = file.filename
    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else None
    
    # Create a secure filename to avoid path traversal
    from werkzeug.utils import secure_filename
    secure_name = secure_filename(filename)
    
    # Define allowed file types
    log_extensions = ['log', 'txt']
    document_extensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'pcap', 'pcapng', 'cap']
    
    # Process the file based on its type
    try:
        # Save original file to disk regardless of type for training purposes
        import os
        import time
        
        # Create timestamped filename to avoid collisions
        timestamp = str(int(time.time()))
        timestamped_name = f"{timestamp}_{secure_name}"
        file_path = os.path.join('uploads/documents', timestamped_name)
        
        # Save the file to disk
        file.save(file_path)
        logger.info(f"Saved uploaded file to {file_path}")
        
        # For log files, additionally process the content and save to database
        if file_extension in log_extensions:
            # Re-open the saved file to process it
            with open(file_path, 'r', encoding='utf-8') as f:
                log_content = f.read()
            
            log_entries = log_processor.parse_logs(log_content)
            
            # Process logs for vector embeddings
            log_processor.process_logs_for_embeddings(log_entries, vector_store)
            
            # Save logs to database
            session = get_db_session()
            saved_count = 0
            
            for log_entry in log_entries:
                # Create database model from log entry
                db_log = DBLogEntry(
                    timestamp=log_entry.timestamp,
                    level=log_entry.level,
                    message=log_entry.message,
                    service=log_entry.service,
                    additional_fields=log_entry.additional_fields
                )
                session.add(db_log)
                saved_count += 1
                
                # Commit in batches to avoid memory issues
                if saved_count % 100 == 0:
                    session.commit()
            
            # Final commit for remaining logs
            session.commit()
            session.close()
            
            logger.info(f"Saved {saved_count} logs to database")
            
            # Return result for log files
            return jsonify({
                "message": f"Log file processed successfully. {saved_count} logs saved to database.",
                "log_count": len(log_entries),
                "logs": [log.to_dict() for log in log_entries[:100]],  # Return first 100 logs for display
                "file_path": file_path
            })
            
        # For document files, register them for fine-tuning
        elif file_extension in document_extensions:
            # Register the document for fine-tuning
            training_doc = None
            try:
                from utils.fine_tuning import TrainingDataProcessor
                data_processor = TrainingDataProcessor()
                
                # Determine content type (telecom or general)
                content_type = request.form.get('content_type', 'telecom')
                
                training_doc = data_processor.register_document(
                    document_path=file_path,
                    document_type=file_extension,
                    content_type=content_type
                )
                
                if training_doc:
                    logger.info(f"Registered document for fine-tuning: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to register document for fine-tuning: {str(e)}")
            
            response_data = {
                "success": True,
                "message": f"Successfully saved document file for training",
                "file_type": file_extension,
                "file_path": file_path
            }
            
            if training_doc:
                response_data["registered_for_fine_tuning"] = True
                response_data["training_document_id"] = training_doc.id
                response_data["content_type"] = content_type
            
            return jsonify(response_data)
            
        else:
            # For unsupported file types, still save but show a warning
            return jsonify({
                "warning": f"Unsupported file type: .{file_extension}. File saved but not processed.",
                "supported_types": log_extensions + document_extensions,
                "file_path": file_path
            }), 200
            
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to process file: {str(e)}"}), 500

@app.route('/api/vector-search', methods=['POST'])
def vector_search():
    """API endpoint for advanced vector search with filtering"""
    data = request.json
    if not data or 'query' not in data:
        return jsonify({"error": "No query provided"}), 400
    
    query = data['query']
    filter_criteria = data.get('filters', None)
    limit = data.get('limit', 10)
    
    try:
        # Check for filter_criteria and validate it's a proper dictionary
        if filter_criteria and not isinstance(filter_criteria, dict):
            return jsonify({"error": "Filters must be a valid dictionary"}), 400
        
        # Process the filter criteria
        processed_filters = {}
        if filter_criteria:
            # Process level filters
            if 'level' in filter_criteria:
                processed_filters['level'] = filter_criteria['level']
            
            # Process service filters
            if 'service' in filter_criteria:
                processed_filters['service'] = filter_criteria['service']
            
            # Process time range filters
            if 'time_range' in filter_criteria:
                time_range = filter_criteria['time_range']
                if isinstance(time_range, dict) and 'start' in time_range and 'end' in time_range:
                    processed_filters['timestamp_after'] = time_range['start']
                    processed_filters['timestamp_before'] = time_range['end']
            
            # Process custom metadata filters
            if 'custom_metadata' in filter_criteria and isinstance(filter_criteria['custom_metadata'], dict):
                for key, value in filter_criteria['custom_metadata'].items():
                    processed_filters[key] = value
        
        # Get relevant logs through vector search
        relevant_logs = vector_store.search(query, k=limit, filter_criteria=processed_filters)
        
        # Format the response
        response = {
            "query": query,
            "total_results": len(relevant_logs),
            "results": relevant_logs,
            "filters_applied": filter_criteria or {}
        }
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error performing vector search: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to perform vector search: {str(e)}"}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_logs():
    """API endpoint to analyze logs and provide suggestions with filtering support"""
    data = request.json
    if not data or 'query' not in data:
        return jsonify({"error": "No query provided"}), 400
    
    query = data['query']
    selected_logs = data.get('selected_logs', [])
    filter_criteria = data.get('filters', None)
    
    try:
        # Check for filter_criteria and validate it's a proper dictionary
        if filter_criteria and not isinstance(filter_criteria, dict):
            return jsonify({"error": "Filters must be a valid dictionary"}), 400
        
        # Process the filter criteria
        processed_filters = {}
        if filter_criteria:
            # Process level filters
            if 'level' in filter_criteria:
                processed_filters['level'] = filter_criteria['level']
            
            # Process service filters
            if 'service' in filter_criteria:
                processed_filters['service'] = filter_criteria['service']
            
            # Process time range filters
            if 'time_range' in filter_criteria:
                # In a real app, we'd convert the time range to a database-specific filter
                # For now, we'll just pass it through
                time_range = filter_criteria['time_range']
                if isinstance(time_range, dict) and 'start' in time_range and 'end' in time_range:
                    processed_filters['timestamp_after'] = time_range['start']
                    processed_filters['timestamp_before'] = time_range['end']
            
            # Process custom metadata filters
            if 'metadata' in filter_criteria and isinstance(filter_criteria['metadata'], dict):
                for key, value in filter_criteria['metadata'].items():
                    processed_filters[key] = value
        
        # Perform analysis with filters
        results = rag_engine.analyze_logs(query, selected_logs, processed_filters)
        
        # Return the results
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error analyzing logs: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to analyze logs: {str(e)}"}), 500

@app.route('/api/logs/stats', methods=['GET'])
def get_log_stats():
    """API endpoint to retrieve statistics about logs from database"""
    try:
        session = get_db_session()
        
        # Get total count
        total_count = session.query(DBLogEntry).count()
        
        # Get count by log level
        level_counts = {}
        level_results = session.query(DBLogEntry.level, 
                                  func.count(DBLogEntry.id))\
                          .group_by(DBLogEntry.level)\
                          .all()
        for level, count in level_results:
            level_counts[level] = count
            
        # Get count by service
        service_counts = {}
        service_results = session.query(DBLogEntry.service, 
                                    func.count(DBLogEntry.id))\
                            .group_by(DBLogEntry.service)\
                            .all()
        for service, count in service_results:
            service_name = service or "unknown"
            service_counts[service_name] = count
            
        # Get timeline data (most recent 24 hours)
        # For this mock version, we'll generate a simple timeline
        # In a production system, we would use SQL to group by hour
        timeline = []
        for hour in range(24):
            timestamp = f"2023-10-15T{hour:02d}:00:00"
            # Just distribute the logs across the hours for demo
            count = total_count // 24
            if hour % 3 == 0:  # Every 3rd hour has more logs for variation
                count = int(count * 1.5)
            timeline.append({"timestamp": timestamp, "count": count})
        
        # Get a subset of recent logs for ML anomaly analysis
        recent_logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(500).all()
        log_entries = [DBLogEntry.to_log_entry(log) for log in recent_logs]
        
        # Generate anomaly stats with ML detection
        if log_entries:
            anomaly_info = log_processor.detect_anomalies(log_entries)
        else:
            anomaly_info = {
                "total_anomalies": 0,
                "mild_anomalies": 0,
                "rule_based_detected": 0,
                "ml_model_trained": False,
                "anomalous_logs": [],
                "mild_anomalous_logs": [],
                "anomaly_patterns": []
            }
            
        session.close()
        
        # Assemble stats
        stats = {
            "total": total_count,
            "by_level": level_counts,
            "by_service": service_counts,
            "timeline": timeline,
            "anomalies": {
                "total": anomaly_info["total_anomalies"] + anomaly_info["mild_anomalies"],
                "critical": anomaly_info["total_anomalies"],
                "mild": anomaly_info["mild_anomalies"],
                "rule_based": anomaly_info["rule_based_detected"],
                "ml_trained": anomaly_info["ml_model_trained"],
                "patterns": anomaly_info["anomaly_patterns"]
            }
        }
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error generating log stats: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Fallback to sample data if database query fails
        return jsonify({
            "total": 5,  # The sample logs we added
            "by_level": {
                "ERROR": 2,
                "WARN": 1,
                "INFO": 2
            },
            "by_service": {
                "database": 4,
                "api": 1
            },
            "timeline": [
                {"timestamp": "2023-10-15T12:00:00", "count": 5}
            ],
            "anomalies": {
                "total": 2,
                "critical": 1,
                "mild": 1,
                "rule_based": 2,
                "ml_trained": False,
                "patterns": []
            }
        })

@app.route('/api/logs/anomalies', methods=['GET'])
def get_log_anomalies():
    """API endpoint to retrieve detected anomalies in logs"""
    try:
        session = get_db_session()
        
        # Get limit from query parameters with default
        limit = request.args.get('limit', default=100, type=int)
        
        # Get recent logs for analysis
        recent_logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(500).all()
        log_entries = [DBLogEntry.to_log_entry(log) for log in recent_logs]
        
        # Detect anomalies using ML and rule-based approaches
        anomaly_info = log_processor.detect_anomalies(log_entries)
        
        # Combine critical and mild anomalies, sorted by score (highest first)
        all_anomalies = anomaly_info["anomalous_logs"] + anomaly_info["mild_anomalous_logs"]
        all_anomalies.sort(key=lambda x: x.get("anomaly_score", 0), reverse=True)
        
        # Limit the number of anomalies returned
        limited_anomalies = all_anomalies[:limit]
        
        # Generate AI-based explanation for the anomalies (if we have anomalies)
        explanation = ""
        if limited_anomalies and llm_interface.is_healthy():
            # Construct a prompt with the detected anomalies
            anomaly_examples = "\n".join([
                f"- {a.get('level', 'INFO')}: {a.get('message', 'No message')} (Score: {a.get('anomaly_score', 0):.2f})"
                for a in limited_anomalies[:5]  # Only include a few examples to keep prompt short
            ])
            
            patterns_text = ""
            if anomaly_info["anomaly_patterns"]:
                patterns_text = "\nDetected patterns in anomalies:\n" + "\n".join([
                    f"- {p.get('explanation', 'Unknown pattern')}"
                    for p in anomaly_info["anomaly_patterns"]
                ])
            
            prompt = f"""
            Analyze these log anomalies detected in the system and provide a brief explanation 
            of what might be happening based on these patterns. Keep your explanation concise.
            
            Recent anomalies detected:
            {anomaly_examples}
            {patterns_text}
            
            Based on these anomalies, what might be happening in the system?
            """
            
            try:
                explanation = llm_interface.generate_text(prompt.strip())
            except Exception as e:
                logger.error(f"Error generating anomaly explanation: {str(e)}")
                explanation = "Could not generate explanation due to LLM service error."
        
        session.close()
        
        # Return anomalies with explanation
        return jsonify({
            "total_anomalies": anomaly_info["total_anomalies"],
            "mild_anomalies": anomaly_info["mild_anomalies"],
            "ml_trained": anomaly_info["ml_model_trained"],
            "anomalies": limited_anomalies,
            "patterns": anomaly_info["anomaly_patterns"],
            "ai_explanation": explanation
        })
    except Exception as e:
        logger.error(f"Error retrieving anomalies: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Fallback if error occurs
        return jsonify({
            "total_anomalies": 0,
            "mild_anomalies": 0,
            "ml_trained": False,
            "anomalies": [],
            "patterns": [],
            "ai_explanation": "Could not analyze anomalies due to an error."
        }), 500
    
    except Exception as e:
        logger.error(f"Error performing vector search: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to perform vector search: {str(e)}"}), 500

@app.route('/api/logs/anomalies/recommendations', methods=['GET'])
def get_anomaly_recommendations():
    """API endpoint to get LLM-based recommendations for detected anomalies"""
    try:
        # Get anomaly IDs from the request
        anomaly_ids_str = request.args.get('anomaly_ids', '')
        
        # If no specific anomaly_ids were provided, return early with a message
        if not anomaly_ids_str:
            return jsonify({
                "recommendations": "Please select specific anomalies to get targeted recommendations.",
                "action_items": []
            })
            
        # Parse anomaly IDs from the request
        try:
            anomaly_ids = [int(aid) for aid in anomaly_ids_str.split(',') if aid]
        except ValueError:
            return jsonify({
                "recommendations": "Invalid anomaly IDs provided.",
                "action_items": []
            }), 400
        
        session = get_db_session()
        
        # First get the anomalies
        # Get recent logs for analysis
        recent_logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(500).all()
        log_entries = [DBLogEntry.to_log_entry(log) for log in recent_logs]
        
        # Detect anomalies using ML and rule-based approaches
        anomaly_info = log_processor.detect_anomalies(log_entries)
        
        # Combine critical and mild anomalies, sorted by score (highest first)
        all_anomalies = anomaly_info["anomalous_logs"] + anomaly_info["mild_anomalous_logs"]
        all_anomalies.sort(key=lambda x: x.get("anomaly_score", 0), reverse=True)
        
        # Filter anomalies to only those requested by ID
        selected_anomalies = []
        for anomaly in all_anomalies:
            if anomaly.get('id') in anomaly_ids:
                selected_anomalies.append(anomaly)
        
        if not selected_anomalies:
            return jsonify({
                "recommendations": "No matching anomalies found for the provided IDs.",
                "action_items": []
            })
        
        # Use the LLM to generate recommendations for the selected anomalies
        logs_text = "\n".join([
            f"[{a.get('timestamp', '')}] {a.get('level', 'INFO')} - {a.get('service', 'unknown')}: {a.get('message', 'No message')}" 
            for a in selected_anomalies  # Only use the selected anomalies
        ])
        
        # Only include patterns that are relevant to the selected anomalies
        relevant_patterns = []
        for pattern in anomaly_info.get("patterns", []):
            for anomaly in selected_anomalies:
                # Check if this pattern matches this anomaly
                if pattern.get("type") in anomaly.get("message", "").lower() or \
                   pattern.get("type") in anomaly.get("service", "").lower():
                    relevant_patterns.append(pattern)
                    break
        
        patterns_text = "\n".join([
            f"- {p.get('explanation', 'Unknown pattern')}" 
            for p in relevant_patterns
        ]) or "No specific patterns detected for these anomalies"
        
        query = f"""
        Analyze these specific anomalous logs from our telecom monitoring system:
        
        {logs_text}
        
        Detected patterns related to these anomalies:
        {patterns_text}
        
        Provide targeted recommendations to address these specific issues, including:
        1. Root cause analysis
        2. Suggested actions to fix the problems
        3. Preventative measures to avoid these issues in the future
        """
        
        # Process with LLM
        if llm_interface and llm_interface.is_healthy():
            try:
                # Import re module for regex
                import re
                
                # Use query_llm as it's the method consistent across all LLM interfaces
                llm_response = llm_interface.query_llm(query, use_telecom_context=True)
                
                # Format the response for easy consumption in the UI
                action_items = []
                
                # Extract action items - we'll assume they're numbered or bulleted
                response_lines = llm_response.split('\n')
                for line in response_lines:
                    line = line.strip()
                    # Look for lines that start with numbers, bullets, or action-oriented phrases
                    if (re.match(r'^\d+\.', line) or 
                        line.startswith('- ') or 
                        line.startswith('* ') or
                        any(phrase in line.lower() for phrase in 
                            ['fix', 'update', 'check', 'restart', 'verify', 'monitor', 'implement'])):
                        action_items.append(line)
                
                return jsonify({
                    "recommendations": llm_response,
                    "action_items": action_items
                })
            except Exception as e:
                logger.error(f"Error generating recommendations with LLM: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({
                    "recommendations": f"Unable to generate recommendations: {str(e)}",
                    "action_items": []
                }), 500
        else:
            return jsonify({
                "recommendations": "LLM interface not available to generate recommendations.",
                "action_items": [
                    "Check log analysis in the AI Assistant tab for more details.",
                    "Review system configuration for any recent changes.",
                    "Verify network connectivity for affected services."
                ]
            })
                
    except Exception as e:
        logger.error(f"Error generating anomaly recommendations: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Failed to generate recommendations: {str(e)}",
            "recommendations": "An error occurred while generating recommendations.",
            "action_items": []
        }), 500

@app.route('/api/telecom/analyze', methods=['POST'])
def analyze_telecom_logs():
    """API endpoint to analyze telecom logs and provide domain-specific suggestions"""
    # Check if telecom components are available
    if not telecom_integration or not telecom_integration.is_healthy():
        return jsonify({
            "error": "Telecom components not available",
            "suggestion": "Telecom-specific analysis not available",
            "domain": "unknown"
        }), 400
        
    data = request.json
    if not data or 'query' not in data:
        return jsonify({"error": "No query provided"}), 400
        
    query = data['query']
    selected_logs = data.get('selected_logs', [])
    
    try:
        # Analyze logs with telecom-specific components
        result = telecom_integration.analyze_telecom_logs(query, selected_logs)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error analyzing telecom logs: {str(e)}")
        return jsonify({
            "error": f"Failed to analyze telecom logs: {str(e)}",
            "query": query,
            "domain": "unknown"
        }), 500

@app.route('/api/telecom/logs/upload', methods=['POST'])
def upload_telecom_logs():
    """API endpoint to upload and process telecom-specific log files"""
    # Check if telecom components are available
    if not telecom_integration or not telecom_integration.is_healthy():
        return jsonify({
            "error": "Telecom components not available"
        }), 400
        
    if 'logfile' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['logfile']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Get the file extension
    filename = file.filename
    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else None
    
    # Create a secure filename to avoid path traversal
    from werkzeug.utils import secure_filename
    secure_name = secure_filename(filename)
    
    # Save file to disk regardless of type
    try:
        # Save original file to disk for training purposes
        import os
        import time
        
        # Create timestamped filename to avoid collisions
        timestamp = str(int(time.time()))
        timestamped_name = f"{timestamp}_telecom_{secure_name}"
        file_path = os.path.join('uploads/documents', timestamped_name)
        
        # Save the file to disk
        file.save(file_path)
        logger.info(f"Saved uploaded telecom file to {file_path}")
        
        # Process the telecom log file if it has a log extension
        log_extensions = ['log', 'txt']
        document_extensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx']
        
        if file_extension in log_extensions:
            # Re-open the saved file to process it
            with open(file_path, 'r', encoding='utf-8') as f:
                log_content = f.read()
            
            # Parse logs with telecom-specific parser
            log_entries = telecom_integration.parse_telecom_logs(log_content)
            
            if not log_entries:
                return jsonify({
                    "warning": "No valid telecom logs found in the file",
                    "file_path": file_path
                }), 200
                
            # Process logs for vector embeddings
            log_processor.process_logs_for_embeddings(log_entries, vector_store)
            
            # Save logs to database
            session = get_db_session()
            saved_count = 0
            
            for log_entry in log_entries:
                # Create database model from log entry
                db_log = DBLogEntry(
                    timestamp=log_entry.timestamp,
                    level=log_entry.level,
                    message=log_entry.message,
                    service=log_entry.service,
                    additional_fields=log_entry.additional_fields
                )
                session.add(db_log)
                saved_count += 1
                
                # Commit in batches to avoid memory issues
                if saved_count % 100 == 0:
                    session.commit()
                    
            # Final commit for remaining logs
            session.commit()
            session.close()
            
            logger.info(f"Saved {saved_count} telecom logs to database")
            
            # Return result
            return jsonify({
                "message": f"Telecom log file processed successfully. {saved_count} logs saved to database.",
                "log_count": len(log_entries),
                "logs": [log.to_dict() for log in log_entries[:20]],  # Return first 20 logs for display
                "telecom_domain": "5G/OpenRAN",
                "file_path": file_path
            })
        elif file_extension in document_extensions:
            # Register the document for fine-tuning
            training_doc = None
            try:
                from utils.fine_tuning import TrainingDataProcessor
                data_processor = TrainingDataProcessor()
                
                # Determine content type (default to telecom for telecom logs)
                content_type = request.form.get('content_type', 'telecom')
                
                training_doc = data_processor.register_document(
                    document_path=file_path,
                    document_type=file_extension,
                    content_type=content_type
                )
                
                if training_doc:
                    logger.info(f"Registered telecom document for fine-tuning: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to register telecom document for fine-tuning: {str(e)}")
            
            response_data = {
                "success": True,
                "message": f"Successfully saved telecom document file for training",
                "file_type": file_extension,
                "file_path": file_path,
                "telecom_domain": "5G/OpenRAN"
            }
            
            if training_doc:
                response_data["registered_for_fine_tuning"] = True
                response_data["training_document_id"] = training_doc.id
                response_data["content_type"] = content_type
            
            return jsonify(response_data)
        else:
            # For unsupported file types, still save but show a warning
            return jsonify({
                "warning": f"Unsupported file type: .{file_extension}. File saved but not processed.",
                "supported_types": log_extensions + document_extensions,
                "file_path": file_path
            }), 200
    except Exception as e:
        logger.error(f"Error processing telecom file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to process telecom file: {str(e)}"}), 500

@app.route('/api/telecom/logs/sample', methods=['GET'])
def get_sample_telecom_logs():
    """API endpoint to retrieve sample telecom logs for testing"""
    # Check if telecom components are available
    if not telecom_integration or not telecom_integration.is_healthy():
        return jsonify({
            "error": "Telecom components not available"
        }), 400
        
    try:
        # Load sample telecom logs
        sample_logs = telecom_integration.load_sample_telecom_logs()
        
        if not sample_logs:
            return jsonify({
                "error": "No sample telecom logs available"
            }), 404
            
        # Process logs for vector embeddings
        log_processor.process_logs_for_embeddings(sample_logs, vector_store)
        
        # Save logs to database
        session = get_db_session()
        saved_count = 0
        
        for log_entry in sample_logs:
            # Create database model from log entry
            db_log = DBLogEntry(
                timestamp=log_entry.timestamp,
                level=log_entry.level,
                message=log_entry.message,
                service=log_entry.service,
                additional_fields=log_entry.additional_fields
            )
            session.add(db_log)
            saved_count += 1
            
            # Commit in batches to avoid memory issues
            if saved_count % 100 == 0:
                session.commit()
                
        # Final commit for remaining logs
        session.commit()
        session.close()
        
        logger.info(f"Saved {saved_count} sample telecom logs to database")
        
        # Return result
        return jsonify({
            "message": f"Sample telecom logs loaded successfully. {saved_count} logs saved to database.",
            "log_count": len(sample_logs),
            "logs": [log.to_dict() for log in sample_logs[:20]]  # Return first 20 logs for display
        })
    except Exception as e:
        logger.error(f"Error loading sample telecom logs: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to load sample telecom logs: {str(e)}"}), 500

@app.route('/api/telecom/anomalies', methods=['GET'])
def get_telecom_anomalies():
    """API endpoint to retrieve detected telecom anomalies in logs"""
    # Check if telecom components are available
    if not telecom_integration or not telecom_integration.is_healthy():
        return jsonify({
            "error": "Telecom components not available"
        }), 400
        
    try:
        session = get_db_session()
        
        # Get limit from query parameters with default
        limit = request.args.get('limit', default=100, type=int)
        
        # Get recent logs for analysis
        recent_logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(500).all()
        log_entries = [DBLogEntry.to_log_entry(log) for log in recent_logs]
        
        # Only keep telecom logs
        telecom_log_entries = []
        for log_entry in log_entries:
            if telecom_integration.is_telecom_log(log_entry):
                telecom_log_entries.append(log_entry)
                
        # If no telecom logs found, return empty result
        if not telecom_log_entries:
            return jsonify({
                "telecom_anomalies_count": 0,
                "telecom_anomalies": [],
                "telecom_anomaly_patterns": [],
                "domain": "unknown",
                "ai_explanation": "No telecom logs found"
            })
            
        # Detect telecom anomalies
        telecom_anomaly_info = telecom_integration.detect_telecom_anomalies(telecom_log_entries)
        
        # Limit the number of anomalies returned
        limited_anomalies = telecom_anomaly_info.get("telecom_anomalies", [])[:limit]
        
        # Generate AI-based explanation for the anomalies (if we have anomalies)
        explanation = ""
        if limited_anomalies and llm_interface.is_healthy():
            # Construct a prompt with the detected anomalies
            anomaly_examples = "\n".join([
                f"- {a.get('level', 'INFO')}: {a.get('message', 'No message')}"
                for a in limited_anomalies[:5]  # Only include a few examples to keep prompt short
            ])
            
            patterns_text = ""
            if telecom_anomaly_info.get("telecom_anomaly_patterns"):
                patterns_text = "\nDetected patterns in telecom anomalies:\n" + "\n".join([
                    f"- {p.get('description', 'Unknown pattern')} in {p.get('component', 'unknown component')}"
                    for p in telecom_anomaly_info.get("telecom_anomaly_patterns", [])
                ])
                
            prompt = f"""
            You are a telecom expert analyzing 5G and OpenRAN log anomalies.
            
            Analyze these telecom log anomalies detected in the system and provide 
            a detailed explanation of what might be happening based on these patterns.
            Focus on the telecom-specific implications and potential root causes.
            
            Recent telecom anomalies detected:
            {anomaly_examples}
            {patterns_text}
            
            Based on these anomalies, explain:
            1. What telecom components or services are affected
            2. The likely root cause of these issues
            3. Recommended troubleshooting steps specific to 5G/OpenRAN systems
            """
            
            try:
                explanation = llm_interface.generate_text(prompt.strip())
            except Exception as e:
                logger.error(f"Error generating telecom anomaly explanation: {str(e)}")
                explanation = "Could not generate explanation due to LLM service error."
                
        session.close()
        
        # Return telecom anomalies with explanation
        return jsonify({
            "telecom_anomalies_count": telecom_anomaly_info.get("telecom_anomalies_count", 0),
            "telecom_anomalies": limited_anomalies,
            "telecom_anomaly_patterns": telecom_anomaly_info.get("telecom_anomaly_patterns", []),
            "domain": telecom_log_entries[0].additional_fields.get("telecom_metadata", {}).get("component_type", "5G/OpenRAN") if telecom_log_entries else "unknown",
            "ai_explanation": explanation
        })
    except Exception as e:
        logger.error(f"Error retrieving telecom anomalies: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Fallback if error occurs
        return jsonify({
            "telecom_anomalies_count": 0,
            "telecom_anomalies": [],
            "telecom_anomaly_patterns": [],
            "domain": "unknown",
            "ai_explanation": f"Error retrieving telecom anomalies: {str(e)}"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """API endpoint for application health check"""
    # Check basic components
    basic_components = {
        "vector_store": vector_store.is_healthy(),
        "llm": llm_interface.is_healthy(),
        "embedding_model": log_processor.is_healthy()
    }
    
    # Check telecom components if available
    telecom_healthy = False
    if telecom_integration:
        telecom_healthy = telecom_integration.is_healthy()
        basic_components["telecom"] = telecom_healthy
    
    # Determine overall status
    overall_status = "healthy"
    if not all(basic_components.values()):
        overall_status = "degraded"
    
    status = {
        "status": overall_status,
        "components": basic_components
    }
    
    return jsonify(status)

# Routes for fine-tuning
# Moved all fine-tuning routes to the end of the file to avoid duplication

@app.route('/api/telecom/health', methods=['GET'])
def telecom_health_check():
    """API endpoint for telecom-specific health monitoring"""
    try:
        # Check if telecom components are available
        if not telecom_integration or not telecom_integration.is_healthy():
            return jsonify({
                "error": "Telecom components not available"
            }), 400
            
        # Get recent logs from database
        session = get_db_session()
        recent_logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(500).all()
        log_entries = [DBLogEntry.to_log_entry(log) for log in recent_logs]
        session.close()
        
        # Filter only telecom logs
        telecom_log_entries = []
        for log_entry in log_entries:
            if telecom_integration.is_telecom_log(log_entry):
                telecom_log_entries.append(log_entry)
        
        # Initialize network health data
        network_health = {
            "5g_core": {
                "nodes": [
                    {"id": "amf", "name": "AMF", "status": "healthy"},
                    {"id": "smf", "name": "SMF", "status": "healthy"},
                    {"id": "upf", "name": "UPF", "status": "healthy"},
                    {"id": "ausf", "name": "AUSF", "status": "healthy"},
                    {"id": "udm", "name": "UDM", "status": "healthy"},
                    {"id": "udr", "name": "UDR", "status": "healthy"},
                    {"id": "pcf", "name": "PCF", "status": "healthy"},
                    {"id": "nrf", "name": "NRF", "status": "healthy"},
                    {"id": "nssf", "name": "NSSF", "status": "healthy"}
                ]
            },
            "openran": {
                "nodes": [
                    {"id": "o-du", "name": "O-DU", "status": "healthy"},
                    {"id": "o-cu-cp", "name": "O-CU-CP", "status": "healthy"}, 
                    {"id": "o-cu-up", "name": "O-CU-UP", "status": "healthy"},
                    {"id": "o-ru", "name": "O-RU", "status": "healthy"},
                    {"id": "ric", "name": "Near-RT RIC", "status": "healthy"}
                ]
            }
        }
        
        # Analyze logs to determine component health
        if telecom_log_entries:
            # Process logs to update network health
            update_network_health(network_health, telecom_log_entries)
        
        # Format data for the frontend charts
        formatted_components = []
        
        # Add 5G Core components
        for node in network_health["5g_core"]["nodes"]:
            formatted_components.append({
                "component": node["name"],
                "status": node["status"],
                "message": f"{node['name']} is {node['status']}",
                "metrics": {
                    # Generate simulated performance metrics
                    "performance": 95 if node["status"] == "healthy" else (75 if node["status"] == "degraded" else 45),
                    "latency": 15 if node["status"] == "healthy" else (35 if node["status"] == "degraded" else 65),
                    "connections": 25000 if node["status"] == "healthy" else (15000 if node["status"] == "degraded" else 5000),
                    "throughput": 450 if node["status"] == "healthy" else (300 if node["status"] == "degraded" else 150)
                }
            })
        
        # Add OpenRAN components
        for node in network_health["openran"]["nodes"]:
            formatted_components.append({
                "component": node["name"],
                "status": node["status"],
                "message": f"{node['name']} is {node['status']}",
                "metrics": {
                    # Generate simulated performance metrics
                    "performance": 92 if node["status"] == "healthy" else (72 if node["status"] == "degraded" else 42),
                    "latency": 12 if node["status"] == "healthy" else (32 if node["status"] == "degraded" else 62),
                    "connections": 15000 if node["status"] == "healthy" else (10000 if node["status"] == "degraded" else 3000),
                    "throughput": 800 if node["status"] == "healthy" else (500 if node["status"] == "degraded" else 200)
                }
            })
        
        return jsonify(formatted_components)
    except Exception as e:
        logger.error(f"Error retrieving telecom health: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def update_network_health(network_health, telecom_logs):
    """Update network health data based on telecom logs"""
    # Track errors by component
    component_errors = {}
    component_warnings = {}
    
    # Analyze logs for errors and warnings
    for log in telecom_logs:
        # Get the component from telecom metadata or service field
        component = None
        if hasattr(log, 'telecom_metadata') and log.telecom_metadata:
            if 'network_function' in log.telecom_metadata:
                component = log.telecom_metadata['network_function'].lower()
        elif log.service:
            component = log.service.lower()
            
        # Skip if component not identified
        if not component:
            continue
            
        # Track errors and warnings by component
        if log.level == "ERROR":
            component_errors[component] = component_errors.get(component, 0) + 1
        elif log.level == "WARN" or log.level == "WARNING":
            component_warnings[component] = component_warnings.get(component, 0) + 1
    
    # Update 5G Core component statuses
    for node in network_health["5g_core"]["nodes"]:
        component_id = node["id"].lower()
        
        # Map AMF to amf, etc.
        component_key = component_id
        if component_id == "amf":
            component_key = "amf"
        elif component_id == "smf":
            component_key = "smf"
        elif component_id == "upf":
            component_key = "upf"
        elif component_id == "ausf":
            component_key = "ausf"
        elif component_id == "udm":
            component_key = "udm"
        elif component_id == "udr":
            component_key = "udr"
        elif component_id == "pcf":
            component_key = "pcf"
        elif component_id == "nrf":
            component_key = "nrf"
        elif component_id == "nssf":
            component_key = "nssf"
        
        # Set status based on errors and warnings
        if component_key in component_errors and component_errors[component_key] > 0:
            node["status"] = "critical"
        elif component_key in component_warnings and component_warnings[component_key] > 0:
            node["status"] = "degraded"
        else:
            node["status"] = "healthy"
    
    # Update OpenRAN component statuses
    for node in network_health["openran"]["nodes"]:
        component_id = node["id"].lower()
        
        # Map o-du to o_du, o-ru to o_ru, etc.
        component_key = component_id.replace("-", "_")
        if component_id == "o-du":
            component_key = "o_du"
        elif component_id == "o-cu-cp":
            component_key = "o_cu_cp"
        elif component_id == "o-cu-up":
            component_key = "o_cu_up"
        elif component_id == "o-ru":
            component_key = "o_ru"
        elif component_id == "ric":
            component_key = "ric"
        
        # Set status based on errors and warnings
        if component_key in component_errors and component_errors[component_key] > 0:
            node["status"] = "critical"
        elif component_key in component_warnings and component_warnings[component_key] > 0:
            node["status"] = "degraded"
        else:
            node["status"] = "healthy"

# Fine-tuning endpoints
@app.route('/api/training/documents', methods=['GET'])
def get_training_documents():
    """API endpoint to get available training documents"""
    try:
        from utils.fine_tuning import TrainingDataProcessor
        processor = TrainingDataProcessor()
        
        # Get query parameters
        content_type = request.args.get('content_type', default=None)
        processed_only = request.args.get('processed_only', default='false').lower() == 'true'
        
        # Get documents
        documents = processor.get_all_training_documents(
            content_type=content_type,
            processed_only=processed_only
        )
        
        # Get stats
        stats = processor.get_stats()
        
        return jsonify({
            "documents": documents,
            "stats": stats
        })
    except Exception as e:
        logger.error(f"Error retrieving training documents: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/training/documents/<int:doc_id>', methods=['GET'])
def get_training_document(doc_id):
    """API endpoint to get details of a specific training document"""
    try:
        from utils.fine_tuning import TrainingDataProcessor
        processor = TrainingDataProcessor()
        
        # Get document from database
        session = get_db_session()
        doc = session.query(DBTrainingData).filter_by(id=doc_id).first()
        
        if not doc:
            return jsonify({"error": f"Document with ID {doc_id} not found"}), 404
            
        # Convert to dictionary
        doc_dict = {
            'id': doc.id,
            'document_path': doc.document_path,
            'document_type': doc.document_type,
            'content_type': doc.content_type,
            'is_processed': bool(doc.is_processed),
            'created_at': doc.created_at.isoformat() if doc.created_at else None
        }
        
        # If document has been processed, get extracted text
        extracted_text = None
        if doc.is_processed and doc.extracted_text:
            try:
                with open(doc.extracted_text, 'r', encoding='utf-8') as f:
                    extracted_text = f.read()
                    # Limit to first 5000 chars for preview
                    if len(extracted_text) > 5000:
                        extracted_text = extracted_text[:5000] + "...\n[Text truncated for preview]"
            except Exception as e:
                logger.error(f"Error reading extracted text for document {doc_id}: {str(e)}")
                extracted_text = f"Error reading extracted text: {str(e)}"
        
        doc_dict['extracted_text'] = extracted_text
        
        session.close()
        return jsonify({"document": doc_dict})
    except Exception as e:
        logger.error(f"Error retrieving document {doc_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/training/documents/<int:doc_id>/process', methods=['POST'])
def process_training_document(doc_id):
    """API endpoint to process a training document"""
    try:
        from utils.fine_tuning import TrainingDataProcessor
        processor = TrainingDataProcessor()
        
        # Process document
        if processor.process_document(doc_id):
            return jsonify({"success": True, "message": f"Document {doc_id} processed successfully"})
        else:
            return jsonify({"error": f"Failed to process document {doc_id}"}), 500
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/training/website', methods=['POST'])
def process_website_for_training():
    """API endpoint to process a website URL for training"""
    try:
        data = request.json
        if not data or 'url' not in data:
            return jsonify({"error": "URL is required"}), 400
            
        url = data['url']
        content_type = data.get('content_type', 'telecom')
        
        from utils.fine_tuning import TrainingDataProcessor
        processor = TrainingDataProcessor()
        
        # Process website
        doc_id = processor.process_website_url(url, content_type)
        
        if doc_id:
            return jsonify({
                "success": True, 
                "message": f"Website processed successfully", 
                "document_id": doc_id
            })
        else:
            return jsonify({"error": f"Failed to process website {url}"}), 500
    except Exception as e:
        logger.error(f"Error processing website: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/fine-tuning/jobs', methods=['GET'])
def get_fine_tuning_jobs():
    """API endpoint to get fine-tuning jobs"""
    try:
        # Get jobs from database
        session = get_db_session()
        jobs = session.query(DBFineTuningJob).order_by(DBFineTuningJob.created_at.desc()).all()
        
        # Convert to dictionaries
        job_dicts = []
        for job in jobs:
            job_dict = {
                'id': job.id,
                'job_name': job.job_name,
                'model_name': job.model_name,
                'fine_tuned_model_name': job.fine_tuned_model_name,
                'status': job.status,
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'updated_at': job.updated_at.isoformat() if job.updated_at else None
            }
            job_dicts.append(job_dict)
            
        session.close()
        return jsonify({"jobs": job_dicts})
    except Exception as e:
        logger.error(f"Error retrieving fine-tuning jobs: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/fine-tuning/jobs', methods=['POST'])
def create_fine_tuning_job():
    """API endpoint to create a fine-tuning job"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Validate required fields
        required_fields = ['job_name', 'model_name', 'training_file_ids']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
                
        # Get parameters
        job_name = data['job_name']
        model_name = data['model_name']
        training_file_ids = data['training_file_ids']
        parameters = data.get('parameters', {})
        
        # Create job
        from utils.fine_tuning import FineTuningManager
        manager = FineTuningManager()
        
        job = manager.create_fine_tuning_job(
            job_name=job_name,
            model_name=model_name,
            training_file_ids=training_file_ids,
            parameters=parameters
        )
        
        if not job:
            return jsonify({"error": "Failed to create fine-tuning job"}), 500
            
        # Start job in background
        manager.start_background_worker()
        
        return jsonify({
            "success": True,
            "message": f"Fine-tuning job '{job_name}' created",
            "job_id": job.id
        })
    except Exception as e:
        logger.error(f"Error creating fine-tuning job: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/fine-tuning/jobs/<int:job_id>', methods=['GET'])
def get_job_status(job_id):
    """API endpoint to get the status of a fine-tuning job"""
    try:
        # Get job from database
        session = get_db_session()
        job = session.query(DBFineTuningJob).filter_by(id=job_id).first()
        
        if not job:
            session.close()
            return jsonify({"error": f"Job with ID {job_id} not found"}), 404
            
        # Convert to dictionary
        job_dict = {
            'id': job.id,
            'job_name': job.job_name,
            'model_name': job.model_name,
            'fine_tuned_model_name': job.fine_tuned_model_name,
            'status': job.status,
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'updated_at': job.updated_at.isoformat() if job.updated_at else None,
            'error_message': job.error_message,
            'training_files': job.training_files,
            'parameters': job.parameters
        }
        
        session.close()
        return jsonify({"job": job_dict})
    except Exception as e:
        logger.error(f"Error retrieving job status for job {job_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/fine-tuning/models', methods=['GET'])
def get_available_models():
    """API endpoint to get available models"""
    try:
        from utils.fine_tuning import FineTuningManager
        manager = FineTuningManager()
        
        # Check if manager is healthy
        if not manager.is_healthy():
            logger.warning("Fine-tuning manager is not healthy, returning simulated models")
            # Return simulated models
            simulated_models = [
                {
                    "name": "llama2",
                    "is_fine_tuned": False,
                    "size": "13B",
                    "status": "available",
                },
                {
                    "name": "mistral",
                    "is_fine_tuned": False,
                    "size": "7B",
                    "status": "available",
                }
            ]
            
            # Add any fine-tuned models from database
            session = get_db_session()
            fine_tuned_jobs = session.query(DBFineTuningJob).filter(
                DBFineTuningJob.status == 'completed',
                DBFineTuningJob.fine_tuned_model_name.isnot(None)
            ).all()
            
            for job in fine_tuned_jobs:
                if job.fine_tuned_model_name:
                    simulated_models.append({
                        "name": job.fine_tuned_model_name,
                        "is_fine_tuned": True,
                        "size": "Custom",
                        "status": "available",
                        "created_at": job.updated_at.isoformat() if job.updated_at else None
                    })
                    
            session.close()
            return jsonify({"models": simulated_models})
        
        # Get models from OLLAMA
        api_models = manager._get_available_models()
        models = []
        
        for model_name in api_models:
            model_info = {
                "name": model_name,
                "is_fine_tuned": False,
                "status": "available"
            }
            
            # Check if it's a fine-tuned model from our system
            if model_name.startswith(('ft-', 'custom-')):
                model_info["is_fine_tuned"] = True
            
            models.append(model_info)
            
        # If no models were found, add default models
        if not models:
            models = [
                {
                    "name": "llama2",
                    "is_fine_tuned": False,
                    "status": "available"
                }
            ]
            
        return jsonify({"models": models})
    except Exception as e:
        logger.error(f"Error retrieving available models: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# LLM Model API endpoints
@app.route('/api/llm/providers', methods=['GET'])
def get_llm_providers():
    """API endpoint to get available LLM providers"""
    try:
        providers = [
            {"id": "ollama", "name": "OLLAMA (Local)", "description": "Locally hosted models"},
            {"id": "anthropic", "name": "Anthropic Claude", "description": "Anthropic's Claude models via API"},
            {"id": "openai", "name": "OpenAI", "description": "OpenAI's GPT models via API"},
            {"id": "perplexity", "name": "Perplexity AI", "description": "Perplexity AI models via API"}
        ]
        
        # Check which providers have API keys configured
        anthropic_available = bool(os.environ.get("ANTHROPIC_API_KEY"))
        openai_available = bool(os.environ.get("OPENAI_API_KEY"))
        perplexity_available = bool(os.environ.get("PERPLEXITY_API_KEY"))
        
        # Set availability status
        for provider in providers:
            if provider["id"] == "ollama":
                provider["available"] = True  # Always available as it's local
            elif provider["id"] == "anthropic":
                provider["available"] = anthropic_available
            elif provider["id"] == "openai":
                provider["available"] = openai_available
            elif provider["id"] == "perplexity":
                provider["available"] = perplexity_available
            
        # Add current provider info
        current_provider = os.environ.get("LLM_PROVIDER", config.LLM_PROVIDER)
        current_model = os.environ.get("LLM_MODEL_NAME", config.LLM_MODEL_NAME)
        
        return jsonify({
            "providers": providers,
            "current_provider": current_provider,
            "current_model": current_model
        })
    except Exception as e:
        logger.error(f"Error getting LLM providers: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/llm/models', methods=['GET'])
def get_llm_models():
    """API endpoint to get available LLM models for all providers"""
    try:
        provider = request.args.get('provider', default=config.LLM_PROVIDER)
        
        # Get models from config
        available_models = config.AVAILABLE_MODELS.get(provider.lower(), [])
        
        # Add current model info
        current_model = os.environ.get("LLM_MODEL_NAME", config.LLM_MODEL_NAME)
        
        # If requesting OLLAMA models, also include fine-tuned models from the database
        if provider.lower() == "ollama":
            session = get_db_session()
            fine_tuned_jobs = session.query(DBFineTuningJob).filter(
                DBFineTuningJob.status == 'completed',
                DBFineTuningJob.fine_tuned_model_name.isnot(None)
            ).all()
            
            for job in fine_tuned_jobs:
                if job.fine_tuned_model_name:
                    # Check if this model is already in the list
                    if not any(model["id"] == job.fine_tuned_model_name for model in available_models):
                        available_models.append({
                            "id": job.fine_tuned_model_name,
                            "name": job.fine_tuned_model_name,
                            "description": f"Fine-tuned model (created {job.updated_at.strftime('%Y-%m-%d')})"
                        })
            
            session.close()
        
        return jsonify({
            "models": available_models,
            "current_model": current_model
        })
    except Exception as e:
        logger.error(f"Error getting LLM models: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/llm/settings', methods=['GET', 'POST'])
def llm_settings():
    """API endpoint to get or update LLM settings"""
    global llm_interface, rag_engine
    
    try:
        if request.method == 'GET':
            # Get current settings
            provider = os.environ.get("LLM_PROVIDER", config.LLM_PROVIDER)
            model = os.environ.get("LLM_MODEL_NAME", config.LLM_MODEL_NAME)
            
            # Get parameters with defaults
            parameters = {
                "temperature": 0.7,
                "max_tokens": 256,
                "top_p": 0.95
            }
            
            # Update with config values if available
            if hasattr(config, 'LLM_PARAMS'):
                if 'temperature' in config.LLM_PARAMS:
                    parameters['temperature'] = config.LLM_PARAMS['temperature']
                if 'max_tokens' in config.LLM_PARAMS:
                    parameters['max_tokens'] = config.LLM_PARAMS['max_tokens']
                if 'top_p' in config.LLM_PARAMS:
                    parameters['top_p'] = config.LLM_PARAMS['top_p']
            
            # Override with environment variables if set
            if "LLM_TEMPERATURE" in os.environ:
                parameters["temperature"] = float(os.environ["LLM_TEMPERATURE"])
            if "LLM_MAX_TOKENS" in os.environ:
                parameters["max_tokens"] = int(os.environ["LLM_MAX_TOKENS"])
            if "LLM_TOP_P" in os.environ:
                parameters["top_p"] = float(os.environ["LLM_TOP_P"])
            
            return jsonify({
                "provider": provider,
                "model": model,
                "parameters": parameters
            })
        else:  # POST
            data = request.json
            
            # Validate required fields
            if not data or "provider" not in data or "model" not in data:
                return jsonify({"error": "Missing required fields"}), 400
            
            provider = data["provider"]
            model = data["model"]
            parameters = data.get("parameters", {})
            
            # Validate provider
            if provider.lower() not in config.AVAILABLE_MODELS:
                return jsonify({"error": f"Invalid provider: {provider}"}), 400
            
            # Validate model
            available_models = [m["id"] for m in config.AVAILABLE_MODELS.get(provider.lower(), [])]
            if model not in available_models and provider.lower() != "ollama":
                # For OLLAMA, allow any model as it could be a locally downloaded model
                return jsonify({"error": f"Invalid model for provider {provider}: {model}"}), 400
            
            # Update environment variables (this will persist for this session)
            os.environ["LLM_PROVIDER"] = provider
            os.environ["LLM_MODEL_NAME"] = model
            
            # Update parameters if provided
            if "temperature" in parameters:
                os.environ["LLM_TEMPERATURE"] = str(parameters["temperature"])
            
            if "max_tokens" in parameters:
                os.environ["LLM_MAX_TOKENS"] = str(parameters["max_tokens"])
            
            if "top_p" in parameters:
                os.environ["LLM_TOP_P"] = str(parameters["top_p"])
            
            # Create new LLM interface with updated settings
            new_llm = get_llm_interface(model_name=model, provider=provider)
            if new_llm:
                llm_interface = new_llm
                # Update the RAG engine with the new LLM
                if 'rag_engine' in globals() and rag_engine and 'vector_store' in globals():
                    rag_engine = RAGEngine(vector_store=vector_store, llm_interface=llm_interface)
                logger.info(f"Updated LLM interface to {provider} / {model}")
            
            return jsonify({
                "success": True,
                "provider": provider,
                "model": model,
                "message": f"Updated LLM settings to use {provider} / {model}"
            })
            
    except Exception as e:
        logger.error(f"Error handling LLM settings: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/llm/api-key', methods=['POST'])
def save_llm_api_key():
    """API endpoint to save an API key for an LLM provider"""
    try:
        data = request.json
        
        # Validate required fields
        if not data or "provider" not in data or "api_key" not in data:
            return jsonify({"error": "Missing required fields: provider and api_key"}), 400
        
        provider = data["provider"].lower()
        api_key = data["api_key"]
        
        # Validate provider
        valid_providers = ["anthropic", "openai", "perplexity"]
        if provider not in valid_providers:
            return jsonify({"error": f"Invalid provider: {provider}. Must be one of {valid_providers}"}), 400
        
        # Set appropriate environment variable based on provider
        if provider == "anthropic":
            os.environ["ANTHROPIC_API_KEY"] = api_key
            key_name = "ANTHROPIC_API_KEY"
        elif provider == "openai":
            os.environ["OPENAI_API_KEY"] = api_key
            key_name = "OPENAI_API_KEY"
        elif provider == "perplexity":
            os.environ["PERPLEXITY_API_KEY"] = api_key
            key_name = "PERPLEXITY_API_KEY"
        
        logger.info(f"Saved API key for {provider}")
        
        return jsonify({
            "success": True,
            "provider": provider,
            "key_name": key_name,
            "message": f"API key for {provider} saved successfully"
        })
        
    except Exception as e:
        logger.error(f"Error saving API key: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# AI Predictive Maintenance API Endpoints


@app.route('/api/get_predictive_maintenance_analysis', methods=['GET'])
def get_predictive_maintenance_analysis():
    """API endpoint to analyze Kubernetes infrastructure health and provide maintenance recommendations with GenAI-enhanced forecasting"""
    try:
        # Log that the endpoint was called
        logger.info("Predictive maintenance analysis endpoint called")
        
        # Initialize GenAI forecasting
        from utils.genai_forecasting import GenAIForecasting
        genai_forecasting = GenAIForecasting()
        
        # Check if predictive maintenance engine is available
        if maintenance_engine is None:
            logger.error("Predictive maintenance engine is None, creating data with GenAI forecasting")
            
            # Create base data
            from datetime import datetime, timedelta
            current_time = datetime.now()
            
            # Create dates for lifecycle start and end
            past_date_1 = current_time - timedelta(days=365)  # 1 year ago
            past_date_2 = current_time - timedelta(days=730)  # 2 years ago
            past_date_3 = current_time - timedelta(days=180)  # 6 months ago
            
            # Create dates for lifecycle end
            end_date_1 = current_time + timedelta(days=730)   # 2 years in future
            end_date_2 = current_time + timedelta(days=365)   # 1 year in future
            end_date_3 = current_time + timedelta(days=1095)  # 3 years in future
            
            # Get Kubernetes pod metrics if available
            pod_metrics = {}
            try:
                from utils.kubernetes_monitor import kubernetes_monitor
                pod_metrics = kubernetes_monitor.get_pod_metrics()
            except Exception as pod_error:
                logger.warning(f"Could not get pod metrics, using defaults: {pod_error}")
                pod_metrics = {}
            
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
                # Add pod metrics to the data for better GenAI forecasting
                "pods": pod_metrics.get("pods", [])
            }
            
            # Generate GenAI-enhanced forecasts
            forecasts = genai_forecasting.generate_forecasts(mock_data)
            
            # Add the forecasts to the mock data
            # Use direct assignment for proper JSON structure expected by the frontend
            mock_data["resource_forecasts"] = forecasts.get("resource_forecasts", [])
            mock_data["lifecycle_predictions"] = forecasts.get("lifecycle_predictions", [])
            
            # Set is_mock_data flag for tracking
            mock_data["is_mock_data"] = True
            
            # Log what we're returning
            logger.info(f"Returning GenAI-enhanced forecasts with {len(mock_data.get('resource_forecasts', []))} resource forecasts and {len(mock_data.get('lifecycle_predictions', []))} lifecycle predictions")
            
            return jsonify(mock_data)
        
        logger.info(f"Predictive maintenance engine exists: {maintenance_engine is not None}")
        
        # Get Kubernetes metrics if available
        k8s_metrics = {}
        try:
            from utils.kubernetes_monitor import KubernetesMonitor
            k8s_monitor = KubernetesMonitor(mock_mode=True)  # Default to mock mode
            k8s_metrics = {
                "cluster_overview": k8s_monitor.get_cluster_overview(),
                "nodes": k8s_monitor.get_node_metrics(),
                "pods": k8s_monitor.get_pod_metrics()
            }
        except Exception as k8s_error:
            logger.warning(f"Error getting Kubernetes metrics: {k8s_error}")
            logger.warning("Proceeding with log-based analysis only")
        
        try:
            # Get recent logs for analysis
            session = get_db_session()
            if session is None:
                logger.error("Failed to get database session for K8s predictive maintenance")
                return jsonify({
                    "error": "Database connection error",
                    "message": "Could not connect to database to retrieve Kubernetes logs."
                }), 500
                
            recent_logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(500).all()
            log_entries = [DBLogEntry.to_log_entry(log) for log in recent_logs]
            session.close()
        except Exception as db_error:
            logger.error(f"Database error in K8s predictive maintenance: {db_error}")
            return jsonify({
                "error": "Database error",
                "message": "Error accessing database to retrieve Kubernetes logs."
            }), 500
        
        # If no logs, use sample logs
        if not log_entries:
            logger.warning("No logs found for K8s predictive maintenance analysis, using sample logs")
            sample_log_entries = []
            for log_dict in SAMPLE_LOGS:
                sample_log_entries.append(LogEntry.from_dict(log_dict))
            log_entries = sample_log_entries
        
        try:
            # Train the model if not already trained
            if not maintenance_engine.is_trained:
                logger.info("Training Kubernetes predictive maintenance model")
                maintenance_engine.train_model(log_entries, k8s_metrics.get("cluster_overview", {}))
            
            # Analyze Kubernetes infrastructure health
            health_analysis = maintenance_engine.analyze_equipment_health(
                log_entries, 
                k8s_metrics.get("cluster_overview", {})
            )
            
            # Add Kubernetes-specific information to the response
            from datetime import datetime
            current_time = datetime.now()
            health_analysis["kubernetes_health"] = {
                "cluster_status": k8s_metrics.get("cluster_overview", {}).get("overall_health", {}).get("status", "unknown"),
                "nodes_total": len(k8s_metrics.get("nodes", {}).get("nodes", [])),
                "pods_total": k8s_metrics.get("pods", {}).get("count", 0),
                "last_update": current_time.isoformat()
            }
            
            # Generate GenAI-enhanced forecasts for this health analysis
            try:
                # Initialize GenAI forecasting
                from utils.genai_forecasting import GenAIForecasting
                genai_forecasting = GenAIForecasting()
                
                # Generate forecasts using the health analysis and metrics
                forecasts_data = {
                    **health_analysis,
                    "pods": k8s_metrics.get("pods", {}).get("pods", [])
                }
                
                forecasts = genai_forecasting.generate_forecasts(forecasts_data)
                
                # Add forecasts to the response
                health_analysis["resource_forecasts"] = forecasts.get("resource_forecasts", [])
                health_analysis["lifecycle_predictions"] = forecasts.get("lifecycle_predictions", [])
                
                # Log what we're adding
                logger.info(f"Added {len(forecasts.get('resource_forecasts', []))} resource forecasts and " 
                           f"{len(forecasts.get('lifecycle_predictions', []))} lifecycle predictions to the response")
            except Exception as forecast_error:
                logger.error(f"Error generating GenAI forecasts: {forecast_error}")
                logger.error("Using empty forecasts")
                health_analysis["resource_forecasts"] = []
                health_analysis["lifecycle_predictions"] = []
            
        except Exception as model_error:
            logger.error(f"Error in Kubernetes predictive maintenance model: {model_error}")
            return jsonify({
                "error": "Model processing error",
                "message": "Error processing Kubernetes data for maintenance analysis."
            }), 500
        
        # Maintenance schedule functionality has been removed as requested
        
        return jsonify(health_analysis)
    except Exception as e:
        logger.error(f"Error analyzing Kubernetes health: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Failed to analyze Kubernetes infrastructure health: {str(e)}",
            "healthy_components": [],
            "at_risk_components": [],
            "maintenance_required": [],
            "recommendations": []
        }), 500

@app.route('/api/predictive-maintenance/train', methods=['POST'])
def train_predictive_maintenance_model():
    """API endpoint to train the Kubernetes predictive maintenance model with provided logs"""
    try:
        # Check if predictive maintenance engine is available
        if maintenance_engine is None:
            return jsonify({
                "error": "Predictive maintenance engine not initialized",
                "message": "The Kubernetes predictive maintenance components failed to initialize."
            }), 500
            
        # Get data from request
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Get log IDs from request, or use all logs if not provided
        log_ids = data.get('log_ids', [])
        
        # Get Kubernetes metrics if available
        k8s_metrics = {}
        try:
            from utils.kubernetes_monitor import KubernetesMonitor
            k8s_monitor = KubernetesMonitor(mock_mode=True)  # Default to mock mode
            k8s_metrics = {
                "cluster_overview": k8s_monitor.get_cluster_overview(),
                "nodes": k8s_monitor.get_node_metrics(),
                "pods": k8s_monitor.get_pod_metrics()
            }
        except Exception as k8s_error:
            logger.warning(f"Error getting Kubernetes metrics for training: {k8s_error}")
            logger.warning("Proceeding with log-based training only")
        
        try:
            # Get logs from database
            session = get_db_session()
            if session is None:
                logger.error("Failed to get database session for Kubernetes maintenance model training")
                return jsonify({
                    "error": "Database connection error",
                    "message": "Could not connect to database to retrieve logs for training."
                }), 500
            
            if log_ids:
                # Get specific logs by ID
                logs = session.query(DBLogEntry).filter(DBLogEntry.id.in_(log_ids)).all()
            else:
                # Get all logs (limited to 1000 for performance)
                logs = session.query(DBLogEntry).order_by(DBLogEntry.timestamp.desc()).limit(1000).all()
                
            log_entries = [DBLogEntry.to_log_entry(log) for log in logs]
            session.close()
        except Exception as db_error:
            logger.error(f"Database error in Kubernetes maintenance model training: {db_error}")
            return jsonify({
                "error": "Database error",
                "message": "Error accessing database to retrieve logs for training."
            }), 500
        
        # If no logs, return error
        if not log_entries:
            return jsonify({
                "error": "No logs found for training",
                "message": "Please upload logs before attempting to train the model."
            }), 400
            
        try:
            # Train the model with Kubernetes metrics if available
            if k8s_metrics:
                success = maintenance_engine.train_model(
                    log_entries, 
                    k8s_metrics.get("cluster_overview", {})
                )
                metrics_used = True
            else:
                success = maintenance_engine.train_model(log_entries)
                metrics_used = False
            
            if success:
                return jsonify({
                    "success": True,
                    "message": f"Successfully trained Kubernetes predictive maintenance model with {len(log_entries)} logs" +
                              (f" and cluster metrics" if metrics_used else ""),
                    "log_count": len(log_entries),
                    "metrics_used": metrics_used
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "Failed to train Kubernetes predictive maintenance model",
                    "log_count": len(log_entries)
                }), 500
        except Exception as model_error:
            logger.error(f"Error in Kubernetes predictive maintenance model training: {model_error}")
            return jsonify({
                "error": "Model training error",
                "message": "Error occurred while training the Kubernetes predictive maintenance model."
            }), 500
            
    except Exception as e:
        logger.error(f"Error training Kubernetes predictive maintenance model: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Failed to train Kubernetes predictive maintenance model: {str(e)}"
        }), 500

# This endpoint has been moved to line 1797
# The code for the original endpoint has been removed due to duplication

# Kubernetes Monitoring API Endpoints

@app.route('/api/kubernetes/overview', methods=['GET'])
def get_kubernetes_overview():
    """API endpoint to get a high-level overview of the Kubernetes cluster health"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        overview = k8s_monitor.get_cluster_overview()
        return jsonify(overview)
    except Exception as e:
        logger.error(f"Error getting Kubernetes cluster overview: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get Kubernetes cluster overview",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500

@app.route('/api/kubernetes/nodes', methods=['GET'])
def get_kubernetes_nodes():
    """API endpoint to get information about Kubernetes nodes"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        node_name = request.args.get('node_name', None)
        metrics = k8s_monitor.get_node_metrics(node_name)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting Kubernetes node metrics: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get Kubernetes node metrics",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500

@app.route('/api/kubernetes/pods', methods=['GET'])
def get_kubernetes_pods():
    """API endpoint to get information about Kubernetes pods"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        namespace = request.args.get('namespace', None)
        label_selector = request.args.get('label_selector', None)
        metrics = k8s_monitor.get_pod_metrics(namespace, label_selector)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting Kubernetes pod metrics: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get Kubernetes pod metrics",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500

@app.route('/api/kubernetes/namespaces', methods=['GET'])
def get_kubernetes_namespaces():
    """API endpoint to get information about Kubernetes namespaces"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        namespace = request.args.get('namespace', None)
        health = k8s_monitor.get_namespace_health(namespace)
        return jsonify(health)
    except Exception as e:
        logger.error(f"Error getting Kubernetes namespace health: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get Kubernetes namespace health",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500

@app.route('/api/kubernetes/l1monitoring', methods=['GET'])
def get_l1monitoring_health():
    """API endpoint to get health information specific to L1 Monitoring components"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        health = k8s_monitor.get_l1monitoring_health()
        return jsonify(health)
    except Exception as e:
        logger.error(f"Error getting L1 Monitoring health: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get L1 Monitoring health",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500
        
@app.route('/api/kubernetes/events', methods=['GET'])
def get_kubernetes_events():
    """API endpoint to get recent Kubernetes events"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        # Get events, filtering by namespace if provided
        namespace = request.args.get('namespace', None)
        events = k8s_monitor._get_recent_events(namespace)
        
        # Add timestamp
        response = {
            'events': events,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error getting Kubernetes events: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get Kubernetes events",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500
        
@app.route('/api/kubernetes/deployments', methods=['GET'])
def get_kubernetes_deployments():
    """API endpoint to get information about Kubernetes deployments"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        # Get deployments, filtering by namespace if provided
        namespace = request.args.get('namespace', None)
        
        # This functionality will be expanded in a future update
        # For now, return a placeholder response with mock data in mock mode
        if hasattr(k8s_monitor, 'mock_mode') and k8s_monitor.mock_mode:
            deployments = {
                'deployments': [
                    {
                        'name': 'app-deployment',
                        'namespace': 'default',
                        'replicas': 3,
                        'available_replicas': 3,
                        'ready_percentage': 100,
                        'status': 'Ready',
                        'age': 86400  # 1 day in seconds
                    },
                    {
                        'name': 'clickhouse-deployment',
                        'namespace': 'default',
                        'replicas': 1,
                        'available_replicas': 1,
                        'ready_percentage': 100,
                        'status': 'Ready',
                        'age': 86400
                    },
                    {
                        'name': 'ollama-deployment',
                        'namespace': 'default',
                        'replicas': 1,
                        'available_replicas': 1,
                        'ready_percentage': 100,
                        'status': 'Ready',
                        'age': 86400
                    }
                ],
                'total_count': 3,
                'ready_count': 3,
                'ready_percentage': 100,
                'timestamp': datetime.utcnow().isoformat()
            }
            return jsonify(deployments)
        else:
            # In production, this would call the Kubernetes API
            # Placeholder for future implementation
            return jsonify({
                'deployments': [],
                'total_count': 0,
                'ready_count': 0,
                'ready_percentage': 0,
                'note': 'Detailed deployment information will be available in a future update.',
                'timestamp': datetime.utcnow().isoformat()
            })
    except Exception as e:
        logger.error(f"Error getting Kubernetes deployments: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get Kubernetes deployments",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500


@app.route('/api/kubernetes/pod-metrics')
def get_pod_metrics():
    """API endpoint to get pod resource usage metrics"""
    try:
        if not k8s_monitor:
            return jsonify({
                "error": "Kubernetes monitoring not available",
                "message": "The Kubernetes monitoring component is not properly initialized"
            }), 500
        
        # Try to get real metrics if possible
        try:
            # This will be implemented in the KubernetesMonitor class
            # For now, we'll return placeholder data in mock mode
            if hasattr(k8s_monitor, 'mock_mode') and k8s_monitor.mock_mode:
                # Generate sample pod data
                pods = [
                    {
                        'name': 'l1-monitoring-app',
                        'namespace': 'default',
                        'cpu_usage': random.randint(100, 350),
                        'memory_usage': random.randint(200, 800),
                        'status': 'Running'
                    },
                    {
                        'name': 'clickhouse-server',
                        'namespace': 'default',
                        'cpu_usage': random.randint(200, 450),
                        'memory_usage': random.randint(800, 1500),
                        'status': 'Running'
                    },
                    {
                        'name': 'postgres-database',
                        'namespace': 'default',
                        'cpu_usage': random.randint(50, 150),
                        'memory_usage': random.randint(300, 600),
                        'status': 'Running'
                    },
                    {
                        'name': 'ollama-model-server',
                        'namespace': 'default',
                        'cpu_usage': random.randint(300, 800),
                        'memory_usage': random.randint(2000, 4000),
                        'status': 'Running'
                    },
                    {
                        'name': 'nginx-proxy',
                        'namespace': 'default',
                        'cpu_usage': random.randint(10, 50),
                        'memory_usage': random.randint(50, 150),
                        'status': 'Running'
                    }
                ]
                
                # Maybe include a bad pod occasionally
                bad_pods = []
                if random.random() > 0.7:
                    bad_pods.append({
                        'name': f'failing-job-{random.randint(1000, 9999)}',
                        'namespace': 'default',
                        'phase': 'Failed' if random.random() > 0.5 else 'Pending',
                        'reason': 'CrashLoopBackOff' if random.random() > 0.5 else 'ContainerCreating'
                    })
                
                return jsonify({
                    'pods': pods,
                    'runningPods': len(pods),
                    'totalPods': len(pods) + len(bad_pods),
                    'badPhasePods': bad_pods,
                    'timestamp': datetime.utcnow().isoformat()
                })
            else:
                # In production, this would call the Kubernetes Metrics API
                # Placeholder for future implementation
                return jsonify({
                    'pods': [],
                    'runningPods': 0,
                    'totalPods': 0,
                    'badPhasePods': [],
                    'note': 'Pod metrics will be available in a future update.',
                    'timestamp': datetime.utcnow().isoformat()
                })
        except Exception as metrics_error:
            logger.warning(f"Could not fetch real pod metrics: {metrics_error}. Using simulated data.")
            # Return an error response that the frontend will handle
            return jsonify({
                "error": "Metrics API not available",
                "message": str(metrics_error),
                "pods": [],
                "runningPods": 0,
                "totalPods": 0,
                "badPhasePods": []
            }), 404
    except Exception as e:
        logger.error(f"Error fetching pod metrics: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Failed to get pod metrics",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "error"
        }), 500


@app.route('/api/vector-search/test', methods=['GET'])
def test_vector_search():
    """API endpoint to test FAISS vector search functionality"""
    try:
        # Get query from request or use default
        query = request.args.get("query", "network connection failure")
        limit = int(request.args.get("limit", "5"))
        
        # Check if vector store is initialized
        if not vector_store or not vector_store.is_healthy():
            return jsonify({
                "status": "error", 
                "message": "Vector store not initialized or in mock mode",
                "mock_results": [
                    {"text": "Sample network connection failure", "score": 0.95, "source": "mock_data"},
                    {"text": "eCPRI fronthaul link down on sector 3", "score": 0.87, "source": "mock_data"},
                    {"text": "Connection timeout on X2 interface", "score": 0.82, "source": "mock_data"},
                    {"text": "5G gNB cell outage detected", "score": 0.78, "source": "mock_data"},
                    {"text": "OpenRAN RU synchronization error", "score": 0.75, "source": "mock_data"}
                ]
            }), 200
            
        # Convert query text to embedding using log processor
        try:
            # Generate embedding for the query text
            query_embedding = log_processor.embedding_model.encode(query)
            
            # Perform search with the embedding
            results = vector_store.search(query_embedding, k=limit)
            
            # Format results
            formatted_results = []
            for result in results:
                metadata = result.get("metadata", {})
                formatted_results.append({
                    "text": metadata.get("message", "No message available"),
                    "level": metadata.get("level", "unknown"),
                    "service": metadata.get("service", "unknown"),
                    "timestamp": metadata.get("timestamp", ""),
                    "score": round(result.get("score", 0.0), 3),
                    "additional_fields": metadata.get("additional_fields", {})
                })
            
            return jsonify({
                "status": "success",
                "query": query,
                "results_count": len(formatted_results),
                "results": formatted_results
            }), 200
            
        except Exception as inner_e:
            logger.warning(f"Error with embedding model: {str(inner_e)}, falling back to mock data")
            return jsonify({
                "status": "warning",
                "message": f"Error with embedding search: {str(inner_e)}",
                "query": query,
                "mock_results": [
                    {"text": "ERROR: Sample network connection failure in sector 3", "level": "ERROR", "service": "network", "timestamp": datetime.now().isoformat(), "score": 0.95},
                    {"text": "WARN: eCPRI fronthaul link down on sector 3", "level": "WARN", "service": "RAN", "timestamp": datetime.now().isoformat(), "score": 0.87},
                    {"text": "ERROR: Connection timeout on X2 interface", "level": "ERROR", "service": "backhaul", "timestamp": datetime.now().isoformat(), "score": 0.82},
                    {"text": "CRITICAL: 5G gNB cell outage detected", "level": "CRITICAL", "service": "cell", "timestamp": datetime.now().isoformat(), "score": 0.78},
                    {"text": "ERROR: OpenRAN RU synchronization error", "level": "ERROR", "service": "OpenRAN", "timestamp": datetime.now().isoformat(), "score": 0.75}
                ]
            }), 200
        
    except Exception as e:
        logger.error(f"Vector search error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500
        
@app.route('/api/vector-search/all', methods=['GET'])
def get_all_vector_store_data():
    """API endpoint to retrieve all data stored in the vector store"""
    try:
        # Check if vector store is initialized
        if not vector_store or not vector_store.is_healthy():
            return jsonify({
                "status": "error", 
                "message": "Vector store not initialized or in mock mode",
                "count": 0,
                "data": []
            }), 200
        
        # Get all metadata from vector store
        all_data = vector_store.get_all_data()
        
        # Format results
        formatted_results = []
        for entry in all_data:
            # Skip entries without a message
            message = entry.get("message", "")
            if not message or message.strip() == "":
                continue
                
            formatted_results.append({
                "message": message,
                "level": entry.get("level", "unknown"),
                "service": entry.get("service", "unknown"),
                "timestamp": entry.get("timestamp", ""),
                "additional_fields": entry.get("additional_fields", {})
            })
        
        return jsonify({
            "status": "success",
            "count": len(formatted_results),
            "data": formatted_results
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving all vector store data: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error", 
            "message": str(e)
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
