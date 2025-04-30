"""
Scheduler for data ingestion pipelines using APScheduler.
This module provides functionality to schedule and execute data ingestion jobs
that interact with NiFi pipelines.
"""
import os
import logging
import time
import random
import json
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta

# Import APScheduler
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.jobstores.memory import MemoryJobStore
    
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)

# Global instance of scheduler
_scheduler_instance = None

# Import utils - done here to avoid circular imports
try:
    from utils.ingestion_processor import get_ingestion_processor
    PROCESSOR_AVAILABLE = True
except ImportError:
    PROCESSOR_AVAILABLE = False
    logger.warning("IngestionProcessor not available, file processing will be limited")

class DataIngestionScheduler:
    """Scheduler for data ingestion jobs that work with NiFi pipelines."""

    def __init__(self):
        """Initialize the scheduler."""
        self.mock_mode = not APSCHEDULER_AVAILABLE
        self.jobs = {}
        self.pipelines = {}
        self.scheduler = None
        
        if APSCHEDULER_AVAILABLE:
            try:
                # Create scheduler
                self.scheduler = BackgroundScheduler()
                self.scheduler.configure(
                    jobstores={
                        'default': MemoryJobStore()
                    },
                    job_defaults={
                        'coalesce': True,
                        'max_instances': 1
                    }
                )
                
                # Import NiFi pipeline class
                try:
                    from utils.nifi_data_pipeline import NiFiPipeline, generate_mock_data
                    self.nifi_pipeline = NiFiPipeline()
                    self.generate_mock_data = generate_mock_data
                    
                    # Check if NiFi is in mock mode or real mode
                    self.mock_mode = self.nifi_pipeline.mock_mode
                    logger.info(f"NiFi pipeline created: mock_mode={self.mock_mode}")
                except Exception as e:
                    logger.error(f"Error initializing NiFi pipeline: {str(e)}")
                    self.nifi_pipeline = None
                    self.mock_mode = True
                    self.generate_mock_data = None
                
                # Start the scheduler
                self.start()
                logger.info("Scheduler initialized and started")
            except Exception as e:
                logger.error(f"Error initializing scheduler: {str(e)}")
                self.scheduler = None
                self.mock_mode = True
        else:
            logger.warning("APScheduler not available. Using mock mode for scheduling.")
            
        # If in mock mode, create sample jobs for demonstration
        if self.mock_mode:
            try:
                self._create_mock_sample_jobs()
            except Exception as e:
                logger.error(f"Error creating mock sample jobs: {str(e)}")

    def start(self):
        """Start the scheduler."""
        if self.scheduler:
            try:
                self.scheduler.start()
                return True
            except Exception as e:
                logger.error(f"Error starting scheduler: {str(e)}")
                return False
        return False

    def shutdown(self):
        """Shutdown the scheduler."""
        if self.scheduler:
            try:
                self.scheduler.shutdown()
                return True
            except Exception as e:
                logger.error(f"Error shutting down scheduler: {str(e)}")
                return False
        return False

    def is_healthy(self) -> bool:
        """Check if the scheduler is healthy and running."""
        if self.mock_mode:
            # In mock mode, we're always "healthy"
            return True
            
        if self.scheduler:
            try:
                return self.scheduler.running
            except Exception:
                return False
        return False

    def is_nifi_available(self) -> bool:
        """Check if NiFi is available or in mock mode."""
        if not hasattr(self, 'nifi_pipeline') or self.nifi_pipeline is None:
            return False
            
        if self.mock_mode:
            # We're in mock mode, but that's fine
            return True
            
        # Check if NiFi is really available (not in mock mode)
        return not self.nifi_pipeline.mock_mode
        
    def _create_mock_sample_jobs(self):
        """Create sample jobs for mock mode to demonstrate functionality."""
        logger.info("Creating mock sample jobs for demonstration")
        
        # Sample 1: SFTP job
        job_id_1 = "sample_telecom_logs"
        local_dir_1 = os.path.join('uploads', 'ingestion', 'default_telecom_logs')
        os.makedirs(local_dir_1, exist_ok=True)
        
        # Create sample job entry
        self.jobs[job_id_1] = {
            'type': 'pipeline_management',
            'schedule_type': 'interval',
            'schedule_value': '15 minutes',
            'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'last_run': (datetime.now() - timedelta(minutes=7)).strftime('%Y-%m-%d %H:%M:%S'),
            'mock_mode': True,
            'process_group_id': f"mock-pg-sftp-{job_id_1}"
        }
        
        # Create pipeline entry
        self.pipelines[job_id_1] = {
            "status": "success",
            "pipeline_type": "sftp",
            "process_group_id": f"mock-pg-sftp-{job_id_1}",
            "process_group_name": f"SFTP_Ingestion_{job_id_1}",
            "local_directory": local_dir_1,
            "remote_host": "telecom-sftp-server.example.com",
            "remote_directory": "/logs/5g/",
            "mock_mode": True,
            "message": "Created mock SFTP pipeline for telecom logs"
        }
        
        # Sample 2: HTTP API job
        job_id_2 = "network_equipment_logs"
        local_dir_2 = os.path.join('uploads', 'ingestion', 'network_equipment_logs')
        os.makedirs(local_dir_2, exist_ok=True)
        
        # Create sample job entry
        self.jobs[job_id_2] = {
            'type': 'pipeline_management',
            'schedule_type': 'interval',
            'schedule_value': '5 minutes',
            'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'last_run': (datetime.now() - timedelta(minutes=3)).strftime('%Y-%m-%d %H:%M:%S'),
            'mock_mode': True,
            'process_group_id': f"mock-pg-http-{job_id_2}"
        }
        
        # Create pipeline entry
        self.pipelines[job_id_2] = {
            "status": "success",
            "pipeline_type": "http",
            "process_group_id": f"mock-pg-http-{job_id_2}",
            "process_group_name": f"HTTP_Ingestion_{job_id_2}",
            "local_directory": local_dir_2,
            "api_url": "https://api.telecom-equipment.example.com/v1/logs",
            "mock_mode": True,
            "message": "Created mock HTTP pipeline for equipment logs"
        }
        
        # Sample 3: Vendor API job (paused state)
        job_id_3 = "telecom_vendor_api"
        local_dir_3 = os.path.join('uploads', 'ingestion', 'telecom_vendor_api')
        os.makedirs(local_dir_3, exist_ok=True)
        
        # Create sample job entry
        self.jobs[job_id_3] = {
            'type': 'pipeline_management',
            'schedule_type': 'cron',
            'schedule_value': '0 */4 * * *',  # Every 4 hours
            'created': (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S'),
            'last_run': (datetime.now() - timedelta(hours=4)).strftime('%Y-%m-%d %H:%M:%S'),
            'mock_mode': True,
            'process_group_id': f"mock-pg-http-{job_id_3}",
            'status': 'paused'  # This job is paused
        }
        
        # Create pipeline entry
        self.pipelines[job_id_3] = {
            "status": "success",
            "pipeline_type": "http",
            "process_group_id": f"mock-pg-http-{job_id_3}",
            "process_group_name": f"HTTP_Ingestion_{job_id_3}",
            "local_directory": local_dir_3,
            "api_url": "https://vendor-api.telecom.example.com/logs",
            "mock_mode": True,
            "message": "Created mock HTTP pipeline for vendor API"
        }
        
        # Add new Component-Specific Jobs
        
        # Sync & Time component job
        job_id_4 = "sync_time_server1"
        local_dir_4 = os.path.join('uploads', 'ingestion', job_id_4)
        os.makedirs(local_dir_4, exist_ok=True)
        
        self.jobs[job_id_4] = {
            'type': 'pipeline_management',
            'schedule_type': 'interval',
            'schedule_value': '20 minutes',
            'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'last_run': (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S'),
            'mock_mode': True,
            'process_group_id': f"mock-pg-sftp-{job_id_4}",
            'component_type': 'sync_time'
        }
        
        self.pipelines[job_id_4] = {
            "status": "success",
            "pipeline_type": "sftp",
            "process_group_id": f"mock-pg-sftp-{job_id_4}",
            "process_group_name": f"SFTP_Ingestion_{job_id_4}",
            "local_directory": local_dir_4,
            "remote_host": "sync-time-server.telecom.example.com",
            "remote_directory": "/logs/sync-time/",
            "mock_mode": True,
            "message": "Created mock SFTP pipeline for Sync & Time component"
        }
        
        # FH Performance metrics job
        job_id_5 = "fh_perf_server2"
        local_dir_5 = os.path.join('uploads', 'ingestion', job_id_5)
        os.makedirs(local_dir_5, exist_ok=True)
        
        self.jobs[job_id_5] = {
            'type': 'pipeline_management',
            'schedule_type': 'interval',
            'schedule_value': '10 minutes',
            'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'last_run': (datetime.now() - timedelta(minutes=2)).strftime('%Y-%m-%d %H:%M:%S'),
            'mock_mode': True,
            'process_group_id': f"mock-pg-sftp-{job_id_5}",
            'component_type': 'fh_performance'
        }
        
        self.pipelines[job_id_5] = {
            "status": "success",
            "pipeline_type": "sftp",
            "process_group_id": f"mock-pg-sftp-{job_id_5}",
            "process_group_name": f"SFTP_Ingestion_{job_id_5}",
            "local_directory": local_dir_5,
            "remote_host": "fh-metrics.telecom.example.com",
            "remote_directory": "/logs/fh-performance/",
            "mock_mode": True,
            "message": "Created mock SFTP pipeline for FH Performance metrics"
        }
        
        # DU Logs job
        job_id_6 = "du_logs_server3"
        local_dir_6 = os.path.join('uploads', 'ingestion', job_id_6)
        os.makedirs(local_dir_6, exist_ok=True)
        
        self.jobs[job_id_6] = {
            'type': 'pipeline_management',
            'schedule_type': 'interval',
            'schedule_value': '15 minutes',
            'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'last_run': (datetime.now() - timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S'),
            'mock_mode': True,
            'process_group_id': f"mock-pg-sftp-{job_id_6}",
            'component_type': 'du_logs'
        }
        
        self.pipelines[job_id_6] = {
            "status": "success",
            "pipeline_type": "sftp",
            "process_group_id": f"mock-pg-sftp-{job_id_6}",
            "process_group_name": f"SFTP_Ingestion_{job_id_6}",
            "local_directory": local_dir_6,
            "remote_host": "du-server.telecom.example.com",
            "remote_directory": "/logs/du/",
            "mock_mode": True,
            "message": "Created mock SFTP pipeline for DU logs"
        }
        
        logger.info(f"Created {len(self.jobs)} mock sample jobs for demonstration")

    def setup_sftp_ingestion(self, 
                           job_id: str,
                           remote_host: str,
                           remote_port: int,
                           remote_username: str,
                           remote_password: str,
                           remote_directory: str,
                           local_directory: str = None,
                           file_filter: str = "*.*",
                           schedule_type: str = "interval",
                           schedule_value: str = "30 minutes",
                           data_type: str = 'telecom_logs',
                           component_type: str = None) -> Dict[str, Any]:
        """
        Set up SFTP data ingestion job.
        
        Args:
            job_id: Unique ID for the job
            remote_host: Remote SFTP server hostname
            remote_port: Remote SFTP server port
            remote_username: Username for SFTP authentication
            remote_password: Password for SFTP authentication
            remote_directory: Remote directory to fetch files from
            local_directory: Local directory to store files in
            file_filter: File filter pattern
            schedule_type: Type of schedule (interval, cron)
            schedule_value: Schedule value (e.g., "30 minutes" for interval, "0 0 * * *" for cron)
            
        Returns:
            Dictionary with job details
        """
        # Create directory for data if it doesn't exist
        if not local_directory:
            # Default to a directory under uploads with job ID
            local_directory = os.path.join('uploads', 'ingestion', job_id)
            
        os.makedirs(local_directory, exist_ok=True)
        
        # Calculate NiFi friendly poll interval
        nifi_schedule = self._convert_to_nifi_time(schedule_value)
        
        # If we have a working NiFi pipeline, set it up
        if hasattr(self, 'nifi_pipeline') and self.nifi_pipeline:
            # Create the pipeline
            pipeline_result = self.nifi_pipeline.create_sftp_to_folder_pipeline(
                process_group_name=f"SFTP_Ingestion_{job_id}",
                remote_host=remote_host,
                remote_port=remote_port,
                remote_username=remote_username,
                remote_password=remote_password,
                remote_directory=remote_directory,
                local_directory=local_directory,
                file_filter=file_filter
            )
            
            # Store the pipeline
            self.pipelines[job_id] = pipeline_result
            
            # If NiFi is available and not in mock mode, schedule pipeline management
            if not self.mock_mode and not pipeline_result.get('mock_mode', True):
                self._schedule_pipeline_management(
                    job_id=job_id,
                    schedule_type=schedule_type,
                    schedule_value=schedule_value,
                    process_group_id=pipeline_result.get('process_group_id')
                )
            else:
                # Otherwise, schedule mock data generation
                self._schedule_mock_data_generation(
                    job_id=job_id,
                    data_type='telecom_logs',
                    output_directory=local_directory,
                    schedule_type=schedule_type,
                    schedule_value=schedule_value,
                    component_type=component_type
                )
        else:
            # No NiFi available, just schedule mock data generation
            self._schedule_mock_data_generation(
                job_id=job_id,
                data_type='telecom_logs',
                output_directory=local_directory,
                schedule_type=schedule_type,
                schedule_value=schedule_value,
                component_type=component_type
            )
            
            # Create fake pipeline info
            self.pipelines[job_id] = {
                "status": "success",
                "pipeline_type": "sftp",
                "process_group_id": f"mock-pg-sftp-{job_id}",
                "process_group_name": f"SFTP_Ingestion_{job_id}",
                "local_directory": local_directory,
                "remote_host": remote_host,
                "remote_directory": remote_directory,
                "mock_mode": True,
                "message": "Created mock SFTP pipeline (NiFi not available)"
            }
        
        # Return job details
        return {
            "status": "success",
            "job_id": job_id,
            "job_type": "sftp",
            "remote_host": remote_host,
            "remote_directory": remote_directory,
            "local_directory": local_directory,
            "schedule_type": schedule_type,
            "schedule_value": schedule_value,
            "mock_mode": self.mock_mode or self.pipelines[job_id].get('mock_mode', True),
            "message": "Job created successfully"
        }

    def setup_http_ingestion(self,
                           job_id: str,
                           api_url: str,
                           http_method: str = "GET",
                           headers: Dict[str, str] = None,
                           auth_username: Optional[str] = None,
                           auth_password: Optional[str] = None,
                           local_directory: str = None,
                           data_type: str = "metrics",
                           schedule_type: str = "interval",
                           schedule_value: str = "15 minutes",
                           component_type: str = None) -> Dict[str, Any]:
        """
        Set up HTTP API data ingestion job.
        
        Args:
            job_id: Unique ID for the job
            api_url: URL of the HTTP API to fetch data from
            http_method: HTTP method (GET, POST, etc.)
            headers: HTTP headers to include in the request
            auth_username: Username for authentication
            auth_password: Password for authentication
            local_directory: Local directory to store API responses
            data_type: Type of data to expect (metrics, events, etc.)
            schedule_type: Type of schedule (interval, cron)
            schedule_value: Schedule value
            
        Returns:
            Dictionary with job details
        """
        # Create directory for data if it doesn't exist
        if not local_directory:
            # Default to a directory under uploads with job ID
            local_directory = os.path.join('uploads', 'ingestion', job_id)
            
        os.makedirs(local_directory, exist_ok=True)
        
        # Calculate NiFi friendly poll interval
        nifi_schedule = self._convert_to_nifi_time(schedule_value)
        
        # Determine authentication type
        auth_type = "None"
        if auth_username and auth_password:
            auth_type = "Basic"
        
        # If we have a working NiFi pipeline, set it up
        if hasattr(self, 'nifi_pipeline') and self.nifi_pipeline:
            # Create the pipeline
            pipeline_result = self.nifi_pipeline.create_http_to_folder_pipeline(
                process_group_name=f"HTTP_Ingestion_{job_id}",
                api_url=api_url,
                http_method=http_method,
                authentication_type=auth_type,
                username=auth_username,
                password=auth_password,
                headers=headers,
                local_directory=local_directory,
                poll_interval=nifi_schedule
            )
            
            # Store the pipeline
            self.pipelines[job_id] = pipeline_result
            
            # If NiFi is available and not in mock mode, schedule pipeline management
            if not self.mock_mode and not pipeline_result.get('mock_mode', True):
                self._schedule_pipeline_management(
                    job_id=job_id,
                    schedule_type=schedule_type,
                    schedule_value=schedule_value,
                    process_group_id=pipeline_result.get('process_group_id')
                )
            else:
                # Otherwise, schedule mock data generation
                self._schedule_mock_data_generation(
                    job_id=job_id,
                    data_type=data_type,
                    output_directory=local_directory,
                    schedule_type=schedule_type,
                    schedule_value=schedule_value,
                    component_type=component_type
                )
        else:
            # No NiFi available, just schedule mock data generation
            self._schedule_mock_data_generation(
                job_id=job_id,
                data_type=data_type,
                output_directory=local_directory,
                schedule_type=schedule_type,
                schedule_value=schedule_value,
                component_type=component_type
            )
            
            # Create fake pipeline info
            self.pipelines[job_id] = {
                "status": "success",
                "pipeline_type": "http",
                "process_group_id": f"mock-pg-http-{job_id}",
                "process_group_name": f"HTTP_Ingestion_{job_id}",
                "api_url": api_url,
                "local_directory": local_directory,
                "mock_mode": True,
                "message": "Created mock HTTP pipeline (NiFi not available)"
            }
        
        # Return job details
        return {
            "status": "success",
            "job_id": job_id,
            "job_type": "http",
            "api_url": api_url,
            "http_method": http_method,
            "local_directory": local_directory,
            "data_type": data_type,
            "schedule_type": schedule_type,
            "schedule_value": schedule_value,
            "mock_mode": self.mock_mode or self.pipelines[job_id].get('mock_mode', True),
            "message": "Job created successfully"
        }

    def _schedule_pipeline_management(self,
                                     job_id: str,
                                     schedule_type: str,
                                     schedule_value: str,
                                     process_group_id: str) -> None:
        """
        Schedule a job to manage NiFi pipeline execution.
        
        Args:
            job_id: Unique ID for the job
            schedule_type: Type of schedule (interval, cron)
            schedule_value: Schedule value
            process_group_id: ID of the NiFi process group
        """
        # Create the manage_pipeline function to run on schedule
        def manage_pipeline():
            """Function that will be executed on schedule to manage the pipeline."""
            try:
                if hasattr(self, 'nifi_pipeline') and self.nifi_pipeline:
                    # Check pipeline status
                    status = self.nifi_pipeline.get_pipeline_status(process_group_id)
                    
                    # Store last run time
                    self.jobs[job_id]['last_run'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Store status
                    self.jobs[job_id]['last_status'] = status
                    
                    # Log the execution
                    logger.info(f"Executed pipeline management for job {job_id}")
                else:
                    logger.warning(f"NiFi pipeline not available for job {job_id}")
            except Exception as e:
                logger.error(f"Error managing pipeline for job {job_id}: {str(e)}")
                self.jobs[job_id]['last_error'] = str(e)
                
                # Fall back to mock data if pipeline fails
                try:
                    if hasattr(self, 'generate_mock_data') and self.generate_mock_data:
                        local_directory = self.pipelines[job_id].get('local_directory')
                        data_type = 'telecom_logs'  # Default for SFTP ingestion
                        
                        if self.pipelines[job_id].get('pipeline_type') == 'http':
                            data_type = 'metrics'  # Default for HTTP ingestion
                            
                        self.generate_mock_data(local_directory, data_type)
                        logger.info(f"Generated fallback mock data for job {job_id}")
                except Exception as mock_error:
                    logger.error(f"Failed to generate fallback mock data for job {job_id}: {str(mock_error)}")
        
        # Create the trigger
        trigger = self._create_trigger(schedule_type, schedule_value)
        
        # Add the job to the scheduler
        if APSCHEDULER_AVAILABLE and self.scheduler:
            # Schedule the job
            job = self.scheduler.add_job(
                manage_pipeline,
                trigger=trigger,
                id=job_id,
                replace_existing=True
            )
            
            # Store job information
            self.jobs[job_id] = {
                'job': job,
                'type': 'pipeline_management',
                'process_group_id': process_group_id,
                'schedule_type': schedule_type,
                'schedule_value': schedule_value,
                'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'mock_mode': False
            }
            
            logger.info(f"Scheduled pipeline management job {job_id}")
        else:
            # Store mock job information
            self.jobs[job_id] = {
                'job': None,
                'type': 'pipeline_management',
                'process_group_id': process_group_id,
                'schedule_type': schedule_type,
                'schedule_value': schedule_value,
                'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'mock_mode': True
            }
            
            logger.warning(f"Created mock pipeline management job {job_id} (scheduler not available)")

    def _schedule_mock_data_generation(self,
                                      job_id: str,
                                      data_type: str,
                                      output_directory: str,
                                      schedule_type: str,
                                      schedule_value: str,
                                      component_type: str = None) -> None:
        """
        Schedule a job to generate mock data.
        
        Args:
            job_id: Unique ID for the job
            data_type: Type of data to generate
            output_directory: Directory to write mock data files
            schedule_type: Type of schedule (interval, cron)
            schedule_value: Schedule value
        """
        # Create the generate_data function to run on schedule
        def generate_data():
            """Function that will be executed on schedule to generate mock data."""
            try:
                if hasattr(self, 'generate_mock_data') and self.generate_mock_data:
                    self.generate_mock_data(output_directory, data_type)
                    
                    # Store last run time
                    self.jobs[job_id]['last_run'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Log the execution
                    logger.info(f"Generated mock data for job {job_id}")
                else:
                    # Fallback mock data generation if the method is not available
                    os.makedirs(output_directory, exist_ok=True)
                    
                    # Generate timestamp for filename
                    timestamp = time.strftime('%Y-%m-%d_%H-%M-%S')
                    
                    # Generate some dummy data based on data_type
                    if data_type == 'telecom_logs':
                        # Determine log properties based on component type
                        if component_type == 'sync_time':
                            services = ["sync-service", "ptp", "time-sync", "ntp"]
                            messages = [
                                "Time synchronization complete",
                                "PTP sync offset: 0.02ms",
                                "Clock source adjusted",
                                "Time sync state: LOCKED",
                                "PTP grandmaster selected: GM-001",
                                "1PPS signal timing offset: 0.003ms",
                                "NTP server communication established",
                                "PRC traceability chain verified"
                            ]
                            levels = ["INFO", "DEBUG", "WARNING"]
                            
                        elif component_type == 'fh_performance':
                            services = ["fronthaul", "ran-perf", "fh-monitor", "ecpri-perf"]
                            messages = [
                                "Fronthaul link capacity: 95%",
                                "eCPRI bandwidth utilization: 10.5 Gbps",
                                "Fronthaul jitter measurement: 0.12ms",
                                "Split-7x interface performance: normal",
                                "Fronthaul link latency: 0.23ms",
                                "eCPRI compression ratio: 2.6:1",
                                "RoE packet loss rate: 0.002%",
                                "Fronthaul availability: 99.997%"
                            ]
                            levels = ["INFO", "DEBUG"]
                            
                        elif component_type == 'du_logs':
                            services = ["du-proc", "du-scheduler", "du-control", "ran-du"]
                            messages = [
                                "DU scheduler allocating resources to UE",
                                "Layer 2 processing complete for cell ID 1024",
                                "RRC connection established for UE-435",
                                "DU resource block allocation optimized",
                                "PDCP PDU processing throughput: 5ms",
                                "DU-CU interface connection healthy",
                                "Handover preparation initiated by DU",
                                "DU MAC scheduler policy updated"
                            ]
                            levels = ["INFO", "WARNING", "DEBUG", "ERROR"]
                            
                        elif component_type == 'fh_transport':
                            services = ["transport", "fh-layer1", "fh-router", "fh-switch"]
                            messages = [
                                "Fronthaul transport link status: UP",
                                "Transport network packet drop: 0.003%",
                                "eCPRI over Ethernet frame count: 1.5M/s",
                                "Fronthaul transport path reconfigured",
                                "Transport network protection switching: completed",
                                "Ethernet ring protection activated",
                                "Transport network sync status: normal",
                                "WDM wavelength stability check passed"
                            ]
                            levels = ["INFO", "WARNING", "ERROR"]
                            
                        elif component_type == 'oran_cus':
                            services = ["oran-cus", "cu-separation", "cu-interface", "cu-split"]
                            messages = [
                                "CU-Plane component startup complete",
                                "C/U separation status: functional",
                                "CU-DU interface latency: 0.44ms",
                                "Control plane traffic flow balanced",
                                "User plane throughput: 12.8 Gbps",
                                "C/U separation resource allocation adjusted",
                                "CU component health check passed",
                                "E2 interface connection established"
                            ]
                            levels = ["INFO", "WARNING", "DEBUG"]
                            
                        elif component_type == 'oran_fu':
                            services = ["oran-fu", "fronthaul-unit", "fu-control", "fu-transport"]
                            messages = [
                                "Fronthaul Unit status: active",
                                "FU protocol adaptation layer started",
                                "FU-RU interface sync established",
                                "Fronthaul Unit processing load: 68%",
                                "FU forwarding capacity: 25 Gbps",
                                "FU beam configuration updated",
                                "Fronthaul Unit redundancy check: passed",
                                "FU IQ sample compression: enabled"
                            ]
                            levels = ["INFO", "WARNING", "ERROR"]
                            
                        elif component_type == 'oran_ru':
                            services = ["oran-ru", "radio-unit", "ru-control", "antenna"]
                            messages = [
                                "Radio Unit power level: 38dBm",
                                "RU temperature: 41.2C - normal",
                                "Antenna array calibration complete",
                                "RU beamforming weights updated",
                                "Radio Unit status: transmitting",
                                "RU power amplifier efficiency: 42%",
                                "Antenna port VSWR check: passed",
                                "RU digital frontend processing state: normal"
                            ]
                            levels = ["INFO", "WARNING", "ERROR", "CRITICAL"]
                            
                        elif component_type == 'ecpri':
                            services = ["ecpri", "ecpri-control", "ecpri-bearer", "ecpri-mgmt"]
                            messages = [
                                "eCPRI bearer established: port 3",
                                "eCPRI message type: IQ Data",
                                "eCPRI protocol version: 2.0",
                                "eCPRI flow control: normal",
                                "eCPRI one-way delay: 0.08ms",
                                "eCPRI synchronization achieved",
                                "Ethernet switch eCPRI priority flow setup",
                                "eCPRI compression ratio changed to 3:1"
                            ]
                            levels = ["INFO", "WARNING", "DEBUG"]
                            
                        else:
                            # Default telecom logs
                            services = ["5g-core", "ran", "ecpri", "fronthaul", "backhaul"]
                            messages = [
                                "System status check completed",
                                "Network communication established",
                                "Signal strength: -75dBm",
                                "Core network processing latency: 5ms",
                                "Handover procedure completed successfully",
                                "RAN resource allocation optimized",
                                "Network slice instantiated",
                                "Service initialization complete"
                            ]
                            levels = ["INFO", "WARNING", "ERROR", "DEBUG"]
                        
                        # Generate logs
                        data = []
                        for i in range(10):
                            data.append({
                                "timestamp": (datetime.now() - timedelta(minutes=random.randint(0, 60))).strftime('%Y-%m-%d %H:%M:%S'),
                                "level": random.choice(levels),
                                "service": random.choice(services),
                                "message": random.choice(messages),
                                "component_type": component_type if component_type else "general"
                            })
                    elif data_type == 'metrics':
                        # Generate metrics based on component type
                        base_metrics = {
                            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            "metrics": {
                                "cpu": random.randint(10, 90),
                                "memory": random.randint(20, 80),
                                "network": random.randint(100, 1000),
                                "latency": random.randint(1, 100)
                            }
                        }
                        
                        # Add component-specific metrics
                        if component_type == 'sync_time':
                            base_metrics["metrics"].update({
                                "time_offset_ns": random.randint(1, 100),
                                "sync_quality": random.randint(95, 100) / 100.0,
                                "holdover_stability": random.randint(90, 99) / 100.0
                            })
                        elif component_type == 'fh_performance':
                            base_metrics["metrics"].update({
                                "bandwidth_gbps": random.randint(5, 25),
                                "packet_loss_percent": random.randint(1, 50) / 10000.0,
                                "jitter_us": random.randint(5, 200)
                            })
                        
                        data = base_metrics
                    else:
                        # Generic data
                        data = {
                            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
                            "type": data_type,
                            "component_type": component_type if component_type else "general",
                            "values": [random.random() for _ in range(5)]
                        }
                    
                    # Write data to file
                    comp_suffix = f"_{component_type}" if component_type else ""
                    filename = f"{timestamp}_{data_type}{comp_suffix}.json"
                    filepath = os.path.join(output_directory, filename)
                    
                    with open(filepath, 'w') as f:
                        json.dump(data, f, indent=2)
                    
                    # Store last run time
                    self.jobs[job_id]['last_run'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Log the execution
                    logger.info(f"Generated basic mock data for job {job_id} using fallback method")
                
                # Process the ingested data using the ingestion processor
                if PROCESSOR_AVAILABLE:
                    try:
                        # Get the ingestion processor
                        telecom_processor = None
                        anomaly_detector = None
                        
                        # Try to get the telecom processor and anomaly detector
                        try:
                            # These might be available in the global scope
                            if 'telecom_processor' in globals():
                                telecom_processor = globals()['telecom_processor']
                            if 'anomaly_detector' in globals():
                                anomaly_detector = globals()['anomaly_detector']
                                
                            # Alternatively, import them
                            if not telecom_processor or not anomaly_detector:
                                from utils.telecom_integration import TelecomIntegration
                                telecom_integration = TelecomIntegration()
                                telecom_processor = telecom_integration.get_processor()
                                from utils.ml_anomaly_detector import anomaly_detector
                        except Exception as e:
                            logger.warning(f"Could not get telecom processor or anomaly detector: {str(e)}")
                        
                        # Get the ingestion processor
                        from utils.ingestion_processor import get_ingestion_processor
                        processor = get_ingestion_processor(
                            telecom_processor=telecom_processor,
                            anomaly_detector=anomaly_detector
                        )
                        
                        # Process the directory
                        result = processor.process_ingestion_directory(output_directory, data_type)
                        logger.info(f"Processed ingested data: {result}")
                        
                        # Store processing result
                        self.jobs[job_id]['last_processing'] = result
                    except Exception as e:
                        logger.error(f"Error processing ingested data: {str(e)}")
                        self.jobs[job_id]['last_processing_error'] = str(e)
                
            except Exception as e:
                logger.error(f"Error generating mock data for job {job_id}: {str(e)}")
                self.jobs[job_id]['last_error'] = str(e)
        
        # Create the trigger
        trigger = self._create_trigger(schedule_type, schedule_value)
        
        # Add the job to the scheduler
        if APSCHEDULER_AVAILABLE and self.scheduler:
            # Schedule the job
            job = self.scheduler.add_job(
                generate_data,
                trigger=trigger,
                id=job_id,
                replace_existing=True
            )
            
            # Store job information
            self.jobs[job_id] = {
                'job': job,
                'type': 'mock_data_generation',
                'data_type': data_type,
                'output_directory': output_directory,
                'schedule_type': schedule_type,
                'schedule_value': schedule_value,
                'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'mock_mode': True
            }
            
            logger.info(f"Scheduled mock data generation job {job_id}")
        else:
            # Store mock job information
            self.jobs[job_id] = {
                'job': None,
                'type': 'mock_data_generation',
                'data_type': data_type,
                'output_directory': output_directory,
                'schedule_type': schedule_type,
                'schedule_value': schedule_value,
                'created': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'mock_mode': True
            }
            
            logger.warning(f"Created mock data generation job {job_id} (scheduler not available)")
            
            # Execute once immediately for testing
            generate_data()

    def _create_trigger(self, schedule_type: str, schedule_value: str) -> Union[IntervalTrigger, CronTrigger]:
        """
        Create a scheduler trigger based on schedule type and value.
        
        Args:
            schedule_type: Type of schedule (interval, cron)
            schedule_value: Schedule value
            
        Returns:
            Appropriate APScheduler trigger
        """
        if not APSCHEDULER_AVAILABLE:
            return None
            
        if schedule_type.lower() == 'interval':
            # Parse interval (e.g., "30 minutes", "1 hour", "5 seconds")
            parts = schedule_value.split()
            if len(parts) != 2:
                raise ValueError(f"Invalid interval format: {schedule_value}. Expected format: '30 minutes'")
                
            value = int(parts[0])
            unit = parts[1].lower().rstrip('s')  # Remove trailing 's' if present
            
            # Map unit to the correct APScheduler parameter
            unit_map = {
                'second': 'seconds',
                'minute': 'minutes',
                'hour': 'hours',
                'day': 'days',
                'week': 'weeks'
            }
            
            scheduler_unit = unit_map.get(unit, unit)
            
            # Create kwargs for the unit
            kwargs = {scheduler_unit: value}
            
            return IntervalTrigger(**kwargs)
        elif schedule_type.lower() == 'cron':
            # Assume schedule_value is a valid cron expression
            return CronTrigger.from_crontab(schedule_value)
        else:
            raise ValueError(f"Unsupported schedule type: {schedule_type}")

    def _convert_to_nifi_time(self, schedule_value: str) -> str:
        """
        Convert a schedule value to NiFi time format.
        
        Args:
            schedule_value: Schedule value in the format "30 minutes"
            
        Returns:
            NiFi time format string (e.g., "30 min")
        """
        # For cron schedules, use a reasonable default
        if not ' ' in schedule_value:
            return "5 min"
            
        parts = schedule_value.split()
        if len(parts) != 2:
            return "5 min"  # Default
            
        value = parts[0]
        unit = parts[1].lower().rstrip('s')  # Remove trailing 's' if present
        
        # Map units to NiFi format
        unit_map = {
            'second': 'sec',
            'minute': 'min',
            'hour': 'hour',
            'day': 'day'
        }
        
        nifi_unit = unit_map.get(unit, 'min')
        return f"{value} {nifi_unit}"

    def list_jobs(self) -> Dict[str, Any]:
        """
        List all scheduled jobs.
        
        Returns:
            Dictionary with job details
        """
        job_list = []
        
        for job_id, job_info in self.jobs.items():
            job_details = {
                'job_id': job_id,
                'type': job_info.get('type', 'unknown'),
                'schedule_type': job_info.get('schedule_type', 'unknown'),
                'schedule_value': job_info.get('schedule_value', 'unknown'),
                'created': job_info.get('created', 'unknown'),
                'last_run': job_info.get('last_run', None),
                'mock_mode': job_info.get('mock_mode', True)
            }
            
            # Add job-specific details
            if job_info.get('type') == 'pipeline_management':
                job_details['process_group_id'] = job_info.get('process_group_id')
                
                # Get pipeline details if available
                if job_id in self.pipelines:
                    pipeline = self.pipelines[job_id]
                    job_details['pipeline_type'] = pipeline.get('pipeline_type')
                    job_details['local_directory'] = pipeline.get('local_directory')
                    
                    if pipeline.get('pipeline_type') == 'sftp':
                        job_details['remote_host'] = pipeline.get('remote_host')
                        job_details['remote_directory'] = pipeline.get('remote_directory')
                    elif pipeline.get('pipeline_type') == 'http':
                        job_details['api_url'] = pipeline.get('api_url')
            elif job_info.get('type') == 'mock_data_generation':
                job_details['data_type'] = job_info.get('data_type')
                job_details['output_directory'] = job_info.get('output_directory')
                
            # Add next run time if available
            if APSCHEDULER_AVAILABLE and job_info.get('job') and hasattr(job_info['job'], 'next_run_time'):
                job_details['next_run'] = job_info['job'].next_run_time.strftime('%Y-%m-%d %H:%M:%S')
                
                # Add status (based on next_run_time)
                # Convert to naive datetime for comparison if needed
                next_run = job_info['job'].next_run_time
                now = datetime.now()
                if next_run.tzinfo is not None:
                    # Convert to naive datetime
                    next_run = next_run.replace(tzinfo=None)
                
                if next_run > now:
                    job_details['status'] = 'scheduled'
                else:
                    job_details['status'] = 'due'
            else:
                job_details['status'] = 'mock' if job_info.get('mock_mode', True) else 'unknown'
                
            job_list.append(job_details)
            
        return {
            "status": "success",
            "count": len(job_list),
            "jobs": job_list
        }

    def get_job_details(self, job_id: str) -> Dict[str, Any]:
        """
        Get details for a specific job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            Dictionary with job details
        """
        if job_id not in self.jobs:
            return {
                "status": "error",
                "message": f"Job {job_id} not found"
            }
            
        job_info = self.jobs[job_id]
        
        # Base details
        job_details = {
            'job_id': job_id,
            'type': job_info.get('type', 'unknown'),
            'schedule_type': job_info.get('schedule_type', 'unknown'),
            'schedule_value': job_info.get('schedule_value', 'unknown'),
            'created': job_info.get('created', 'unknown'),
            'last_run': job_info.get('last_run', None),
            'last_error': job_info.get('last_error', None),
            'mock_mode': job_info.get('mock_mode', True)
        }
        
        # Add job-specific details
        if job_info.get('type') == 'pipeline_management':
            job_details['process_group_id'] = job_info.get('process_group_id')
            
            # Get pipeline details if available
            if job_id in self.pipelines:
                pipeline = self.pipelines[job_id]
                job_details['pipeline_type'] = pipeline.get('pipeline_type')
                job_details['local_directory'] = pipeline.get('local_directory')
                
                if pipeline.get('pipeline_type') == 'sftp':
                    job_details['remote_host'] = pipeline.get('remote_host')
                    job_details['remote_directory'] = pipeline.get('remote_directory')
                elif pipeline.get('pipeline_type') == 'http':
                    job_details['api_url'] = pipeline.get('api_url')
                    
                # Add last status if available
                if job_info.get('last_status'):
                    job_details['pipeline_status'] = job_info['last_status']
        elif job_info.get('type') == 'mock_data_generation':
            job_details['data_type'] = job_info.get('data_type')
            job_details['output_directory'] = job_info.get('output_directory')
            
        # Add next run time if available
        if APSCHEDULER_AVAILABLE and job_info.get('job') and hasattr(job_info['job'], 'next_run_time'):
            job_details['next_run'] = job_info['job'].next_run_time.strftime('%Y-%m-%d %H:%M:%S')
            
            # Add status (based on next_run_time)
            # Convert to naive datetime for comparison if needed
            next_run = job_info['job'].next_run_time
            now = datetime.now()
            if next_run.tzinfo is not None:
                # Convert to naive datetime
                next_run = next_run.replace(tzinfo=None)
            
            if next_run > now:
                job_details['status'] = 'scheduled'
            else:
                job_details['status'] = 'due'
        else:
            job_details['status'] = 'mock' if job_info.get('mock_mode', True) else 'unknown'
            
        # Check for generated data
        if 'output_directory' in job_details or 'local_directory' in job_details:
            directory = job_details.get('output_directory', job_details.get('local_directory'))
            if directory and os.path.exists(directory):
                # Get list of files in directory
                files = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]
                job_details['files'] = files[:10]  # Limit to 10 files
                job_details['file_count'] = len(files)
            
        return {
            "status": "success",
            "job": job_details
        }

    def pause_job(self, job_id: str) -> Dict[str, Any]:
        """
        Pause a scheduled job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            Dictionary with operation status
        """
        if job_id not in self.jobs:
            return {
                "status": "error",
                "message": f"Job {job_id} not found"
            }
            
        job_info = self.jobs[job_id]
        
        if job_info.get('mock_mode', True):
            # Just pretend we paused it
            self.jobs[job_id]['status'] = 'paused'
            return {
                "status": "success",
                "message": f"Job {job_id} paused (mock mode)",
                "job_id": job_id
            }
            
        if APSCHEDULER_AVAILABLE and job_info.get('job'):
            try:
                self.scheduler.pause_job(job_id)
                return {
                    "status": "success",
                    "message": f"Job {job_id} paused",
                    "job_id": job_id
                }
            except Exception as e:
                logger.error(f"Error pausing job {job_id}: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Failed to pause job {job_id}: {str(e)}"
                }
        else:
            return {
                "status": "error",
                "message": f"Cannot pause job {job_id}: scheduler not available"
            }

    def resume_job(self, job_id: str) -> Dict[str, Any]:
        """
        Resume a paused job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            Dictionary with operation status
        """
        if job_id not in self.jobs:
            return {
                "status": "error",
                "message": f"Job {job_id} not found"
            }
            
        job_info = self.jobs[job_id]
        
        if job_info.get('mock_mode', True):
            # Just pretend we resumed it
            self.jobs[job_id]['status'] = 'scheduled'
            return {
                "status": "success",
                "message": f"Job {job_id} resumed (mock mode)",
                "job_id": job_id
            }
            
        if APSCHEDULER_AVAILABLE and job_info.get('job'):
            try:
                self.scheduler.resume_job(job_id)
                return {
                    "status": "success",
                    "message": f"Job {job_id} resumed",
                    "job_id": job_id
                }
            except Exception as e:
                logger.error(f"Error resuming job {job_id}: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Failed to resume job {job_id}: {str(e)}"
                }
        else:
            return {
                "status": "error",
                "message": f"Cannot resume job {job_id}: scheduler not available"
            }

    def remove_job(self, job_id: str) -> Dict[str, Any]:
        """
        Remove a scheduled job.
        
        Args:
            job_id: ID of the job
            
        Returns:
            Dictionary with operation status
        """
        if job_id not in self.jobs:
            return {
                "status": "error",
                "message": f"Job {job_id} not found"
            }
            
        job_info = self.jobs[job_id]
        
        # Remove from scheduler if available
        if APSCHEDULER_AVAILABLE and job_info.get('job') and self.scheduler:
            try:
                self.scheduler.remove_job(job_id)
            except Exception as e:
                logger.error(f"Error removing job {job_id} from scheduler: {str(e)}")
        
        # Remove from our tracking
        del self.jobs[job_id]
        
        # Remove pipeline if available
        if job_id in self.pipelines:
            del self.pipelines[job_id]
            
        return {
            "status": "success",
            "message": f"Job {job_id} removed",
            "job_id": job_id
        }


def get_scheduler() -> DataIngestionScheduler:
    """
    Get or create the scheduler singleton instance.
    
    Returns:
        DataIngestionScheduler instance
    """
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = DataIngestionScheduler()
    return _scheduler_instance


def init_background_worker():
    """Initialize the background worker (scheduler)."""
    scheduler = get_scheduler()
    setup_default_jobs(scheduler)
    return scheduler


def setup_default_jobs(scheduler: DataIngestionScheduler):
    """
    Setup default jobs for development and testing.
    
    Args:
        scheduler: DataIngestionScheduler instance
    """
    try:
        # Set up a mock telecom log generation job for testing
        default_log_directory = os.path.join('uploads', 'ingestion', 'default_telecom_logs')
        os.makedirs(default_log_directory, exist_ok=True)
        
        scheduler.setup_sftp_ingestion(
            job_id="demo_telecom_logs",
            remote_host="example.com",  # Demo values, won't be used in mock mode
            remote_port=22,
            remote_username="demo",
            remote_password="demo",
            remote_directory="/logs",
            local_directory=default_log_directory,
            schedule_type="interval",
            schedule_value="30 minutes"
        )
        
        # Set up a mock metrics generation job for testing
        default_metrics_directory = os.path.join('uploads', 'ingestion', 'default_metrics')
        os.makedirs(default_metrics_directory, exist_ok=True)
        
        scheduler.setup_http_ingestion(
            job_id="demo_metrics",
            api_url="https://api.example.com/metrics",  # Demo values
            http_method="GET",
            local_directory=default_metrics_directory,
            data_type="metrics",
            schedule_type="interval",
            schedule_value="15 minutes"
        )
        
        logger.info("Default ingestion jobs set up successfully")
    except Exception as e:
        logger.error(f"Error setting up default jobs: {str(e)}")