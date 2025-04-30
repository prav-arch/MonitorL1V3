"""
Component-specific data collector for L1 Monitoring application.
This module provides specialized collection for various telecom component logs 
including Sync & Time, FH Performance, DU, FH Transport, and O-RAN-FH components.
"""
import os
import logging
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

# Configure logging
logger = logging.getLogger(__name__)

class ComponentDataCollector:
    """Collects and processes component-specific data from external sources."""

    def __init__(self, scheduler=None, nifi_pipeline=None):
        """
        Initialize the component data collector.
        
        Args:
            scheduler: Optional DataIngestionScheduler instance
            nifi_pipeline: Optional NiFiPipeline instance
        """
        self.scheduler = scheduler
        self.nifi_pipeline = nifi_pipeline
        self.job_configs = {}
        self.initialized_jobs = set()
        
        # Component-specific configuration
        self.component_configs = {
            'sync_time': {
                'name': 'Sync & Time',
                'description': 'Time synchronization and PTP logs',
                'file_filter': '*.log,*.txt,*.sync',
                'default_remote_path': '/logs/sync-time/',
                'job_id_prefix': 'sync_time_',
                'data_type': 'telecom_logs'
            },
            'fh_performance': {
                'name': 'FH Performance Metrics',
                'description': 'Fronthaul performance data and metrics',
                'file_filter': '*.log,*.json,*.csv',
                'default_remote_path': '/logs/fh-performance/',
                'job_id_prefix': 'fh_perf_',
                'data_type': 'telecom_logs'
            },
            'du_logs': {
                'name': 'DU Logs',
                'description': 'Distributed Unit processing logs',
                'file_filter': '*.log,*.txt',
                'default_remote_path': '/logs/du/',
                'job_id_prefix': 'du_logs_',
                'data_type': 'telecom_logs'
            },
            'fh_transport': {
                'name': 'FH Transport Logs',
                'description': 'Fronthaul transport and connectivity logs',
                'file_filter': '*.log,*.pcap,*.txt',
                'default_remote_path': '/logs/fh-transport/',
                'job_id_prefix': 'fh_transport_',
                'data_type': 'telecom_logs'
            },
            'oran_cus': {
                'name': 'O-RAN-FH CUS',
                'description': 'Control User Separation component logs',
                'file_filter': '*.log,*.json',
                'default_remote_path': '/logs/oran-cus/',
                'job_id_prefix': 'oran_cus_',
                'data_type': 'telecom_logs'
            },
            'oran_fu': {
                'name': 'O-RAN-FH FU',
                'description': 'Fronthaul Unit logs',
                'file_filter': '*.log,*.json',
                'default_remote_path': '/logs/oran-fu/',
                'job_id_prefix': 'oran_fu_',
                'data_type': 'telecom_logs'
            },
            'oran_ru': {
                'name': 'O-RAN-FH RU',
                'description': 'Radio Unit logs',
                'file_filter': '*.log,*.json',
                'default_remote_path': '/logs/oran-ru/',
                'job_id_prefix': 'oran_ru_',
                'data_type': 'telecom_logs'
            },
            'ecpri': {
                'name': 'eCPRI',
                'description': 'Enhanced CPRI logs and data',
                'file_filter': '*.log,*.pcap,*.json',
                'default_remote_path': '/logs/ecpri/',
                'job_id_prefix': 'ecpri_',
                'data_type': 'telecom_logs'
            }
        }
        
    def setup_all_component_jobs(self, 
                               server_config: Dict[str, Any],
                               schedule_config: Dict[str, Any] = None,
                               components: List[str] = None) -> Dict[str, Any]:
        """
        Set up ingestion jobs for all or specified component types.
        
        Args:
            server_config: Remote server configuration with host, port, username, password
            schedule_config: Job schedule configuration (optional)
            components: List of component types to set up jobs for (optional, all if None)
            
        Returns:
            Dictionary with job setup results
        """
        if not components:
            # Default to all components
            components = list(self.component_configs.keys())
            
        if not schedule_config:
            # Default schedule configuration
            schedule_config = {
                'type': 'interval',
                'value': '30 minutes'
            }
            
        results = {}
        
        # Set up jobs for each requested component
        for component in components:
            if component in self.component_configs:
                try:
                    job_result = self.setup_component_job(
                        component_type=component,
                        server_config=server_config,
                        schedule_config=schedule_config
                    )
                    results[component] = job_result
                except Exception as e:
                    logger.error(f"Error setting up job for component {component}: {str(e)}")
                    results[component] = {
                        "status": "error",
                        "message": f"Failed to create job: {str(e)}"
                    }
            else:
                results[component] = {
                    "status": "error",
                    "message": f"Unknown component type: {component}"
                }
                
        return {
            "status": "success" if all(r.get("status") == "success" for r in results.values()) else "partial",
            "component_jobs": results
        }
    
    def setup_component_job(self,
                         component_type: str,
                         server_config: Dict[str, Any],
                         schedule_config: Dict[str, Any] = None,
                         remote_directory: str = None,
                         custom_job_id: str = None) -> Dict[str, Any]:
        """
        Set up an ingestion job for a specific component.
        
        Args:
            component_type: Type of component to collect data for
            server_config: Remote server configuration (host, port, username, password)
            schedule_config: Job schedule configuration (optional)
            remote_directory: Custom remote directory path (optional)
            custom_job_id: Custom job ID (optional)
            
        Returns:
            Dictionary with job details
        """
        if component_type not in self.component_configs:
            return {
                "status": "error",
                "message": f"Unknown component type: {component_type}"
            }
            
        # Get component configuration
        comp_config = self.component_configs[component_type]
        
        # Generate job ID if not provided
        if not custom_job_id:
            server_name = server_config.get('host', '').split('.')[0]
            job_id = f"{comp_config['job_id_prefix']}{server_name}_{int(time.time())}"
        else:
            job_id = custom_job_id
            
        # Get remote directory
        if not remote_directory:
            remote_directory = comp_config['default_remote_path']
            
        # Set schedule configuration
        if not schedule_config:
            schedule_config = {
                'type': 'interval',
                'value': '30 minutes'
            }
            
        # Create local directory path
        local_directory = os.path.join('uploads', 'ingestion', job_id)
        
        # Store job configuration
        self.job_configs[job_id] = {
            'component_type': component_type,
            'server_config': server_config,
            'remote_directory': remote_directory,
            'schedule_config': schedule_config,
            'local_directory': local_directory,
            'file_filter': comp_config['file_filter']
        }
        
        # Check if we have the scheduler
        if not self.scheduler:
            return {
                "status": "error",
                "message": "Scheduler not available"
            }
            
        try:
            # Create the job using scheduler
            result = self.scheduler.setup_sftp_ingestion(
                job_id=job_id,
                remote_host=server_config.get('host'),
                remote_port=server_config.get('port', 22),
                remote_username=server_config.get('username'),
                remote_password=server_config.get('password'),
                remote_directory=remote_directory,
                local_directory=local_directory,
                file_filter=comp_config['file_filter'],
                schedule_type=schedule_config.get('type', 'interval'),
                schedule_value=schedule_config.get('value', '30 minutes'),
                data_type=comp_config['data_type']
            )
            
            # Add to initialized jobs
            self.initialized_jobs.add(job_id)
            
            return {
                "status": "success",
                "job_id": job_id,
                "component_type": component_type,
                "component_name": comp_config['name'],
                "local_directory": local_directory,
                "remote_directory": remote_directory,
                "server": server_config.get('host'),
                "schedule": schedule_config,
                "message": f"Created job for {comp_config['name']} on {server_config.get('host')}"
            }
        except Exception as e:
            logger.error(f"Error setting up job for component {component_type}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to create job: {str(e)}"
            }
    
    def get_all_component_jobs(self) -> Dict[str, Any]:
        """
        Get information about all component ingestion jobs.
        
        Returns:
            Dictionary with job information
        """
        job_info = {}
        
        # Go through initialized jobs and get status
        for job_id in self.initialized_jobs:
            if job_id in self.job_configs:
                config = self.job_configs[job_id]
                comp_type = config['component_type']
                comp_config = self.component_configs.get(comp_type, {})
                
                # Get job status from scheduler if available
                job_status = "unknown"
                last_run = None
                
                if self.scheduler and hasattr(self.scheduler, 'get_job_status'):
                    job_data = self.scheduler.get_job_status(job_id)
                    if job_data:
                        job_status = job_data.get('status', 'unknown')
                        last_run = job_data.get('last_run')
                
                job_info[job_id] = {
                    "component_type": comp_type,
                    "component_name": comp_config.get('name', comp_type),
                    "status": job_status,
                    "server": config['server_config'].get('host'),
                    "remote_directory": config['remote_directory'],
                    "local_directory": config['local_directory'],
                    "schedule": config['schedule_config'],
                    "last_run": last_run
                }
                
        return {
            "status": "success",
            "count": len(job_info),
            "jobs": job_info
        }
    
    def update_component_job(self, 
                          job_id: str, 
                          schedule_config: Dict[str, Any] = None,
                          paused: bool = None) -> Dict[str, Any]:
        """
        Update an existing component job.
        
        Args:
            job_id: The job ID to update
            schedule_config: New schedule configuration (optional)
            paused: Whether to pause or resume the job (optional)
            
        Returns:
            Dictionary with update result
        """
        if job_id not in self.job_configs:
            return {
                "status": "error",
                "message": f"Job ID {job_id} not found"
            }
            
        # Check if scheduler is available
        if not self.scheduler:
            return {
                "status": "error",
                "message": "Scheduler not available"
            }
            
        try:
            update_result = {}
            
            # Update schedule if provided
            if schedule_config and hasattr(self.scheduler, 'update_job_schedule'):
                update_result['schedule'] = self.scheduler.update_job_schedule(
                    job_id=job_id,
                    schedule_type=schedule_config.get('type'),
                    schedule_value=schedule_config.get('value')
                )
                
                # Update stored config
                if update_result['schedule'].get('status') == 'success':
                    self.job_configs[job_id]['schedule_config'] = schedule_config
            
            # Pause/resume job if specified
            if paused is not None and hasattr(self.scheduler, 'pause_job') and hasattr(self.scheduler, 'resume_job'):
                if paused:
                    update_result['paused'] = self.scheduler.pause_job(job_id)
                else:
                    update_result['paused'] = self.scheduler.resume_job(job_id)
            
            return {
                "status": "success",
                "job_id": job_id,
                "updates": update_result
            }
            
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to update job: {str(e)}"
            }
    
    def trigger_component_job_execution(self, job_id: str) -> Dict[str, Any]:
        """
        Trigger immediate execution of a component job.
        
        Args:
            job_id: The job ID to trigger
            
        Returns:
            Dictionary with execution result
        """
        if job_id not in self.job_configs:
            return {
                "status": "error",
                "message": f"Job ID {job_id} not found"
            }
            
        # Check if scheduler is available
        if not self.scheduler:
            return {
                "status": "error",
                "message": "Scheduler not available"
            }
            
        try:
            # Trigger immediate execution
            if hasattr(self.scheduler, 'trigger_job'):
                result = self.scheduler.trigger_job(job_id)
                return result
            else:
                return {
                    "status": "error",
                    "message": "Trigger job functionality not available"
                }
                
        except Exception as e:
            logger.error(f"Error triggering job {job_id}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to trigger job: {str(e)}"
            }
    
    def get_component_job_history(self, job_id: str) -> Dict[str, Any]:
        """
        Get execution history for a component job.
        
        Args:
            job_id: The job ID to get history for
            
        Returns:
            Dictionary with job history
        """
        if job_id not in self.job_configs:
            return {
                "status": "error",
                "message": f"Job ID {job_id} not found"
            }
            
        # Check if scheduler is available
        if not self.scheduler:
            return {
                "status": "error",
                "message": "Scheduler not available"
            }
            
        try:
            # Get job history
            if hasattr(self.scheduler, 'get_job_history'):
                result = self.scheduler.get_job_history(job_id)
                return result
            else:
                # Create dummy history if not available
                return {
                    "status": "success",
                    "job_id": job_id,
                    "history": [
                        {
                            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            "status": "success",
                            "files_processed": 0,
                            "message": "No history available"
                        }
                    ]
                }
                
        except Exception as e:
            logger.error(f"Error getting history for job {job_id}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to get job history: {str(e)}"
            }

# Singleton instance
_component_data_collector = None

def get_component_data_collector(scheduler=None, nifi_pipeline=None):
    """
    Get or create the component data collector singleton instance.
    
    Args:
        scheduler: Optional DataIngestionScheduler instance
        nifi_pipeline: Optional NiFiPipeline instance
        
    Returns:
        ComponentDataCollector instance
    """
    global _component_data_collector
    if not _component_data_collector:
        _component_data_collector = ComponentDataCollector(
            scheduler=scheduler,
            nifi_pipeline=nifi_pipeline
        )
    return _component_data_collector