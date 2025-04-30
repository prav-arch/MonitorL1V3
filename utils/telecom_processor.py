"""
Telecom-specific log processor for 5G and OpenRAN logs
This module extends the basic log processor with specialized rules and metadata
extraction for telecom logs, focusing on 5G and OpenRAN technologies.
"""

import re
import logging
import os
from typing import List, Dict, Any, Optional, Tuple
from models import LogEntry

# Configure proper numpy handling - only import if available
try:
    import numpy as np
except ImportError:
    # Create a simple replacement for np.mean if numpy is not available
    class MockNumpy:
        @staticmethod
        def mean(values):
            return sum(values) / len(values) if values else 0
    np = MockNumpy()

# Configure logging
logger = logging.getLogger(__name__)

class TelecomLogProcessor:
    """Telecom-specific log processor for 5G and OpenRAN logs"""
    
    def __init__(self, base_processor=None):
        """Initialize the telecom log processor
        
        Args:
            base_processor: The base log processor to extend
        """
        self.base_processor = base_processor
        
        # Define telecom component patterns
        self.component_patterns = {
            # 5G Core Network Functions
            '5G': {
                'AMF': r'\b(AMF|Access\s*and\s*Mobility\s*Function)\b',
                'SMF': r'\b(SMF|Session\s*Management\s*Function)\b',
                'UPF': r'\b(UPF|User\s*Plane\s*Function)\b',
                'AUSF': r'\b(AUSF|Authentication\s*Server\s*Function)\b',
                'UDM': r'\b(UDM|Unified\s*Data\s*Management)\b',
                'PCF': r'\b(PCF|Policy\s*Control\s*Function)\b',
                'NRF': r'\b(NRF|Network\s*Repository\s*Function)\b',
                'NSSF': r'\b(NSSF|Network\s*Slice\s*Selection\s*Function)\b',
                'NEF': r'\b(NEF|Network\s*Exposure\s*Function)\b',
                'UDR': r'\b(UDR|Unified\s*Data\s*Repository)\b'
            },
            # OpenRAN Components
            'OpenRAN': {
                'O-RU': r'\b(O\-RU|O\s*RU|RU)\b',
                'O-DU': r'\b(O\-DU|O\s*DU|DU)\b',
                'O-CU-CP': r'\b(O\-CU\-CP|CU\-CP|O\-CU\s*CP|CU\s*CP|CU)\b',
                'O-CU-UP': r'\b(O\-CU\-UP|CU\-UP|O\-CU\s*UP|CU\s*UP)\b',
                'Near-RT RIC': r'\b(Near\-RT\s*RIC|Near\s*RT\s*RIC|Near\s*RIC|RIC)\b',
                'Non-RT RIC': r'\b(Non\-RT\s*RIC|Non\s*RT\s*RIC|Non\s*RIC)\b',
                'xApp': r'\b(xApp|x\-App)\b',
                'rApp': r'\b(rApp|r\-App)\b',
                'SMO': r'\b(SMO|Service\s*Management\s*Orchestration)\b',
                'eCPRI': r'\b(eCPRI|enhanced\s*CPRI|e\-CPRI)\b',
                # Additional O-RAN-FH components
                'O-RAN-FH-CUS': r'\b(CUS|Control\s*User\s*Plane\s*Separation)\b',
                'O-RAN-FH-FU': r'\b(FU|Fronthaul\s*Unit)\b',
                'Sync-Time': r'\b(Sync[\s-]*Time|Synchronization[\s-]*Time|PTP)\b',
                'FH-Transport': r'\b(FH[\s-]*Transport|Fronthaul[\s-]*Transport)\b',
                'FH-Performance': r'\b(FH[\s-]*Performance|Performance[\s-]*Metrics)\b'
            }
        }
        
        # Define interface patterns
        self.interface_patterns = {
            # 5G Interfaces
            '5G': {
                'N1': r'\b(N1|N1\s*interface)\b',
                'N2': r'\b(N2|N2\s*interface)\b',
                'N3': r'\b(N3|N3\s*interface)\b',
                'N4': r'\b(N4|N4\s*interface)\b',
                'N5': r'\b(N5|N5\s*interface)\b',
                'N6': r'\b(N6|N6\s*interface)\b',
                'N9': r'\b(N9|N9\s*interface)\b',
                'N11': r'\b(N11|N11\s*interface)\b',
                'N12': r'\b(N12|N12\s*interface)\b',
                'N15': r'\b(N15|N15\s*interface)\b'
            },
            # OpenRAN Interfaces
            'OpenRAN': {
                'E2': r'\b(E2|E2\s*interface)\b',
                'O1': r'\b(O1|O1\s*interface)\b',
                'A1': r'\b(A1|A1\s*interface)\b',
                'F1': r'\b(F1|F1\s*interface|F1\-C|F1\-U)\b',
                'F1-C': r'\b(F1\-C|F1\s*C)\b',
                'F1-U': r'\b(F1\-U|F1\s*U)\b',
                'E1': r'\b(E1|E1\s*interface)\b',
                'Open Fronthaul': r'\b(Open\s*Fronthaul|Fronthaul)\b',
                'Xn': r'\b(Xn|Xn\s*interface)\b',
                'eCPRI': r'\b(eCPRI|e\-CPRI|enhanced\s*CPRI\s*interface)\b'
            }
        }
        
        # Define telecom log patterns
        self.log_patterns = {
            # 5G Core Log Patterns
            '5G': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+([A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # OpenRAN Log Patterns
            'OpenRAN': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+([A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # eCPRI Log Patterns (also falls under OpenRAN category)
            'eCPRI': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(eCPRI|e-CPRI|[A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # Sync & Time Log Patterns
            'Sync-Time': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(Sync[_-]Time|PTP|[A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # FH Performance Metrics Pattern
            'FH-Performance': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(FH[_-]Perf|Performance|Metrics|[A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # DU Log Pattern
            'DU-Logs': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(DU|O-DU|[A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # FH Transport Log Pattern
            'FH-Transport': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(FH[_-]Transport|Transport|[A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # O-RAN-FH CUS Pattern
            'O-RAN-FH-CUS': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(CUS|Control-User|[A-Za-z0-9\-]+)\s+\|\s+(.*)$'),
            # O-RAN-FH FU Pattern
            'O-RAN-FH-FU': re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}.\d{3})\s+\|\s+([A-Z]+)\s+\|\s+(FU|Fronthaul-Unit|[A-Za-z0-9\-]+)\s+\|\s+(.*)$')
        }
        
        # Initialize anomaly patterns for telecom
        self.telecom_anomaly_patterns = {
            # Critical errors
            'critical': [
                r'connection\s+failed',
                r'failed\s+to\s+establish',
                r'initialization\s+failed',
                r'authentication\s+failed',
                r'registration\s+rejected',
                r'pdu\s+session\s+establishment\s+failed',
                r'fronthaul\s+failure',
                r'synchronization\s+error',
                r'handover\s+failure',
                r'interface\s+down',
                r'service\s+failure',
                r'network\s+slice\s+failure',
                # eCPRI specific critical failures
                r'ecpri\s+message\s+type\s+error',
                r'ecpri\s+sequence\s+number\s+violation',
                r'ecpri\s+protocol\s+error',
                r'ecpri\s+connection\s+lost',
                r'ecpri\s+synchronization\s+failure',
                r'invalid\s+ecpri\s+message',
                r'ecpri\s+session\s+establishment\s+failed',
                # Sync & Time critical errors
                r'ptp\s+synchronization\s+lost',
                r'clock\s+drift\s+exceeded\s+threshold',
                r'time\s+source\s+failure',
                r'primary\s+clock\s+failure',
                r'sync\s+reference\s+lost',
                # FH Performance critical issues
                r'fronthaul\s+overload',
                r'performance\s+degradation\s+critical',
                r'bandwidth\s+exhausted',
                r'packet\s+drop\s+rate\s+critical',
                # DU critical issues
                r'du\s+process\s+crash',
                r'du\s+resource\s+exhaustion',
                r'du\s+initialization\s+failed',
                # FH Transport critical issues
                r'transport\s+link\s+down',
                r'transport\s+congestion\s+critical',
                # CUS critical issues
                r'control\s+plane\s+separation\s+failure',
                r'user\s+plane\s+failure',
                # FU critical issues
                r'fronthaul\s+unit\s+failure',
                r'fu\s+connection\s+lost'
            ],
            # Warning patterns
            'warning': [
                r'retrying',
                r'packet\s+loss',
                r'throughput\s+degradation',
                r'qos\s+not\s+met',
                r'high\s+latency',
                r'resource\s+utilization\s+high',
                r'cell\s+load\s+high',
                r'limited\s+capacity',
                r'interference\s+detected',
                # eCPRI specific warnings
                r'ecpri\s+delay\s+measurement\s+fluctuation',
                r'ecpri\s+one-way\s+delay\s+degraded',
                r'ecpri\s+message\s+retransmission',
                r'ecpri\s+partial\s+loss',
                r'ecpri\s+bandwidth\s+limitation',
                # Sync & Time warnings
                r'ptp\s+accuracy\s+degraded',
                r'clock\s+drift\s+warning',
                r'time\s+source\s+switching',
                r'sync\s+quality\s+degraded',
                # FH Performance warnings
                r'fronthaul\s+utilization\s+high',
                r'jitter\s+increased',
                r'variable\s+latency\s+detected',
                # DU warnings
                r'du\s+cpu\s+usage\s+high',
                r'du\s+memory\s+usage\s+high',
                r'du\s+process\s+restarting',
                # FH Transport warnings
                r'transport\s+bandwidth\s+utilization\s+high',
                r'transport\s+jitter\s+increasing',
                # CUS warnings
                r'control\s+plane\s+congestion',
                r'user\s+plane\s+congestion',
                # FU warnings
                r'fronthaul\s+unit\s+performance\s+degraded',
                r'fu\s+buffer\s+utilization\s+high'
            ],
            # Informational anomalies
            'info': [
                r'unexpected\s+message',
                r'unusual\s+traffic\s+pattern',
                r'configuration\s+changed',
                r'failover\s+activated',
                r'redundancy\s+switched',
                r'state\s+change',
                # eCPRI specific informational patterns
                r'ecpri\s+session\s+established',
                r'ecpri\s+version\s+negotiated',
                r'ecpri\s+configuration\s+update',
                r'ecpri\s+bearer\s+modification',
                # Sync & Time info
                r'ptp\s+source\s+changed',
                r'clock\s+calibration\s+performed',
                r'sync\s+mode\s+changed',
                # FH Performance info
                r'performance\s+profile\s+changed',
                r'metrics\s+collection\s+rate\s+changed',
                # DU info
                r'du\s+configuration\s+updated',
                r'du\s+software\s+updated',
                # FH Transport info
                r'transport\s+path\s+changed',
                r'transport\s+configuration\s+updated',
                # CUS info
                r'control\s+user\s+separation\s+reconfigured',
                r'plane\s+separation\s+mode\s+changed',
                # FU info
                r'fronthaul\s+unit\s+reconfigured',
                r'fu\s+operating\s+mode\s+changed'
            ]
        }
    
    def detect_telecom_log_type(self, log_entry: LogEntry) -> Optional[str]:
        """Detect if a log entry is telecom-related and its type
        
        Args:
            log_entry: The log entry to check
            
        Returns:
            Telecom log type ('5G' or 'OpenRAN') or None if not telecom
        """
        # Check if already classified (from additional_fields)
        if log_entry.additional_fields and 'telecom_metadata' in log_entry.additional_fields:
            return log_entry.additional_fields['telecom_metadata'].get('component_type')
        
        # Check for specific OpenRAN-related terms in service or message
        
        # eCPRI detection (part of OpenRAN)
        if (log_entry.service and re.search(r'\b(eCPRI|e\-CPRI|enhanced\s*CPRI)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(eCPRI|e\-CPRI|enhanced\s*CPRI)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
        
        # Sync & Time detection
        if (log_entry.service and re.search(r'\b(Sync[\s-]*Time|PTP|Precision\s*Time\s*Protocol)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(Sync[\s-]*Time|PTP|Precision\s*Time\s*Protocol)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
        
        # FH Performance detection
        if (log_entry.service and re.search(r'\b(FH[\s-]*Performance|Fronthaul\s*Performance|Performance\s*Metrics)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(FH[\s-]*Performance|Fronthaul\s*Performance|Performance\s*Metrics)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
        
        # DU Logs detection
        if (log_entry.service and re.search(r'\b(DU|O-DU)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(DU\s*log|O-DU\s*log)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
        
        # FH Transport detection
        if (log_entry.service and re.search(r'\b(FH[\s-]*Transport|Fronthaul\s*Transport)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(FH[\s-]*Transport|Fronthaul\s*Transport)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
        
        # CUS detection
        if (log_entry.service and re.search(r'\b(CUS|Control\s*User\s*Separation)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(CUS|Control\s*User\s*Separation)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
        
        # FU detection
        if (log_entry.service and re.search(r'\b(FU|Fronthaul\s*Unit)\b', log_entry.service, re.IGNORECASE)) or \
           (log_entry.message and re.search(r'\b(FU|Fronthaul\s*Unit)\b', log_entry.message, re.IGNORECASE)):
            return 'OpenRAN'
            
        # Check service name for telecom components
        if log_entry.service:
            for component_type in ['5G', 'OpenRAN']:
                for component_name in self.component_patterns[component_type]:
                    if re.search(self.component_patterns[component_type][component_name], log_entry.service, re.IGNORECASE):
                        return component_type
                        
        # Check message content for telecom components
        if log_entry.message:
            for component_type in ['5G', 'OpenRAN']:
                for component_name in self.component_patterns[component_type]:
                    if re.search(self.component_patterns[component_type][component_name], log_entry.message, re.IGNORECASE):
                        return component_type
                        
            # Check for interfaces as a fallback
            for component_type in ['5G', 'OpenRAN']:
                for interface_name in self.interface_patterns[component_type]:
                    if re.search(self.interface_patterns[component_type][interface_name], log_entry.message, re.IGNORECASE):
                        return component_type
                        
        return None
        
    def enrich_log_entry(self, log_entry: LogEntry) -> LogEntry:
        """Enrich a log entry with telecom-specific metadata
        
        Args:
            log_entry: The log entry to enrich
            
        Returns:
            Enriched log entry
        """
        # Skip if not a telecom log
        telecom_type = self.detect_telecom_log_type(log_entry)
        if not telecom_type:
            return log_entry
            
        # Initialize additional_fields if None
        if log_entry.additional_fields is None:
            log_entry.additional_fields = {}
            
        # Initialize telecom_metadata if not exists
        if 'telecom_metadata' not in log_entry.additional_fields:
            log_entry.additional_fields['telecom_metadata'] = {}
            
        # Set component type
        log_entry.additional_fields['telecom_metadata']['component_type'] = telecom_type
        
        # Extract network function/component
        network_function = self._extract_network_function(log_entry, telecom_type)
        if network_function:
            log_entry.additional_fields['telecom_metadata']['network_function'] = network_function
            
        # Extract interfaces
        interfaces = self._extract_interfaces(log_entry, telecom_type)
        if interfaces:
            log_entry.additional_fields['telecom_metadata']['interfaces'] = interfaces
            
        # Extract procedure
        procedure = self._extract_procedure(log_entry)
        if procedure:
            log_entry.additional_fields['telecom_metadata']['procedure'] = procedure
            
        return log_entry
        
    def _extract_network_function(self, log_entry: LogEntry, telecom_type: str) -> Optional[str]:
        """Extract network function or component from log entry
        
        Args:
            log_entry: The log entry to analyze
            telecom_type: The telecom type ('5G' or 'OpenRAN')
            
        Returns:
            Network function/component name or None
        """
        # Check service first
        if log_entry.service:
            for component_name in self.component_patterns[telecom_type]:
                if re.search(self.component_patterns[telecom_type][component_name], log_entry.service, re.IGNORECASE):
                    return component_name
                    
        # Then check message
        if log_entry.message:
            for component_name in self.component_patterns[telecom_type]:
                if re.search(self.component_patterns[telecom_type][component_name], log_entry.message, re.IGNORECASE):
                    return component_name
                    
        return None
        
    def _extract_interfaces(self, log_entry: LogEntry, telecom_type: str) -> List[str]:
        """Extract interfaces from log entry
        
        Args:
            log_entry: The log entry to analyze
            telecom_type: The telecom type ('5G' or 'OpenRAN')
            
        Returns:
            List of interface names
        """
        interfaces = []
        
        if log_entry.message:
            for interface_name in self.interface_patterns[telecom_type]:
                if re.search(self.interface_patterns[telecom_type][interface_name], log_entry.message, re.IGNORECASE):
                    interfaces.append(interface_name)
                    
        return interfaces
        
    def _extract_procedure(self, log_entry: LogEntry) -> Optional[str]:
        """Extract telecom procedure from log entry
        
        Args:
            log_entry: The log entry to analyze
            
        Returns:
            Procedure name or None
        """
        if not log_entry.message:
            return None
            
        # 5G Core procedures
        core_procedures = {
            'registration': r'\b(registration|registering|registered)\b',
            'authentication': r'\b(authentication|authenticating|authenticated)\b',
            'pdu_session': r'\b(pdu\s*session|session\s*establishment)\b',
            'handover': r'\b(handover|handoff)\b',
            'slice_selection': r'\b(slice\s*selection|network\s*slice)\b',
            'policy_control': r'\b(policy\s*control|pcf\s*rules)\b'
        }
        
        # OpenRAN procedures
        ran_procedures = {
            'cell_setup': r'\b(cell\s*setup|cell\s*initialization|initialization)\b',
            'resource_allocation': r'\b(resource\s*allocation|scheduling)\b',
            'beamforming': r'\b(beamforming|beam\s*management)\b',
            'fronthaul_management': r'\b(fronthaul\s*management|fronthaul\s*initialization)\b',
            'e2_subscription': r'\b(e2\s*subscription|subscription|e2\s*message)\b',
            'xapp_control': r'\b(xapp\s*control|xapp\s*message)\b',
            
            # eCPRI specific procedures
            'ecpri_one_way_delay': r'\b(ecpri\s*one\s*way\s*delay|one\s*way\s*delay\s*measurement)\b',
            'ecpri_framing': r'\b(ecpri\s*framing|framing\s*configuration)\b',
            'ecpri_bandwidth_allocation': r'\b(ecpri\s*bandwidth|bandwidth\s*allocation)\b',
            'ecpri_synchronization': r'\b(ecpri\s*synchronization)\b',
            'ecpri_message_type': r'\b(ecpri\s*message\s*type|message\s*type\s*negotiation)\b',
            
            # Sync & Time specific procedures
            'ptp_synchronization': r'\b(ptp\s*synchronization|synchronization\s*protocol)\b',
            'clock_calibration': r'\b(clock\s*calibration|time\s*calibration)\b',
            'sync_source_selection': r'\b(sync\s*source\s*selection|time\s*source\s*selection)\b',
            'sync_monitoring': r'\b(sync\s*monitoring|clock\s*monitoring)\b',
            
            # FH Performance procedures
            'performance_monitoring': r'\b(performance\s*monitoring|metrics\s*collection)\b',
            'fh_capacity_planning': r'\b(fronthaul\s*capacity|capacity\s*planning)\b',
            'latency_measurement': r'\b(latency\s*measurement|delay\s*measurement)\b',
            'throughput_assessment': r'\b(throughput\s*assessment|bandwidth\s*assessment)\b',
            
            # DU specific procedures
            'du_initialization': r'\b(du\s*initialization|du\s*startup)\b',
            'du_configuration': r'\b(du\s*configuration|du\s*setup)\b',
            'du_resource_management': r'\b(du\s*resource\s*management|resource\s*allocation)\b',
            
            # FH Transport procedures
            'transport_path_setup': r'\b(transport\s*path\s*setup|path\s*establishment)\b',
            'transport_monitoring': r'\b(transport\s*monitoring|link\s*monitoring)\b',
            'transport_qos_management': r'\b(transport\s*qos|qos\s*management)\b',
            
            # O-RAN-FH CUS procedures
            'cus_configuration': r'\b(cus\s*configuration|control\s*user\s*configuration)\b',
            'cus_plane_separation': r'\b(plane\s*separation|control\s*user\s*separation)\b',
            
            # O-RAN-FH FU procedures
            'fu_initialization': r'\b(fu\s*initialization|fronthaul\s*unit\s*startup)\b',
            'fu_configuration': r'\b(fu\s*configuration|fronthaul\s*unit\s*configuration)\b'
        }
        
        # Check for procedures
        for proc_name, pattern in {**core_procedures, **ran_procedures}.items():
            if re.search(pattern, log_entry.message, re.IGNORECASE):
                return proc_name
                
        return None
        
    def parse_telecom_logs(self, log_content: str) -> List[LogEntry]:
        """Parse telecom-specific log formats into LogEntry objects
        
        Args:
            log_content: The raw log content to parse
            
        Returns:
            List of parsed LogEntry objects
        """
        log_entries = []
        
        # Try to find matches for both 5G and OpenRAN log patterns
        for type_name, pattern in self.log_patterns.items():
            for line in log_content.splitlines():
                line = line.strip()
                if not line:
                    continue
                    
                match = pattern.match(line)
                if match:
                    timestamp, level, service, message = match.groups()
                    
                    # Create log entry
                    log_entry = LogEntry(
                        timestamp=timestamp,
                        level=level,
                        message=message,
                        service=service,
                        additional_fields={}
                    )
                    
                    # Enrich log entry
                    enriched_entry = self.enrich_log_entry(log_entry)
                    log_entries.append(enriched_entry)
                    
        return log_entries
        
    def detect_telecom_anomalies(self, log_entries: List[LogEntry]) -> Dict[str, Any]:
        """Detect telecom-specific anomalies in logs
        
        Args:
            log_entries: List of log entries to analyze
            
        Returns:
            Dictionary with telecom anomaly information
        """
        # Filter only telecom logs
        telecom_logs = []
        for entry in log_entries:
            if self.detect_telecom_log_type(entry):
                telecom_logs.append(entry)
                
        if not telecom_logs:
            return {
                "telecom_anomalies_count": 0,
                "telecom_anomalies": [],
                "telecom_anomaly_patterns": []
            }
            
        # Find anomalies based on patterns
        anomalies = []
        anomaly_patterns = {}
        
        for log in telecom_logs:
            # Check for explicit error levels
            if log.level in ['ERROR', 'CRITICAL', 'FATAL']:
                component_type = log.additional_fields.get('telecom_metadata', {}).get('component_type', 'telecom')
                network_function = log.additional_fields.get('telecom_metadata', {}).get('network_function', 'unknown')
                
                anomalies.append({
                    'log_id': log.id,
                    'timestamp': log.timestamp,
                    'level': log.level,
                    'message': log.message,
                    'service': log.service,
                    'telecom_metadata': log.additional_fields.get('telecom_metadata', {}),
                    'anomaly_type': 'error_level',
                    'severity': 'critical',
                    'description': f"{component_type} {network_function} error"
                })
                
                # Update anomaly patterns counter
                component_key = f"{component_type}_{network_function}_errors"
                if component_key not in anomaly_patterns:
                    anomaly_patterns[component_key] = {
                        'count': 0,
                        'component': network_function,
                        'component_type': component_type,
                        'description': f"{network_function} errors",
                        'severity': 'critical'
                    }
                anomaly_patterns[component_key]['count'] += 1
                
            # Check for pattern-based anomalies
            else:
                message_lower = log.message.lower()
                
                # Check critical patterns
                for pattern in self.telecom_anomaly_patterns['critical']:
                    if re.search(pattern, message_lower):
                        component_type = log.additional_fields.get('telecom_metadata', {}).get('component_type', 'telecom')
                        network_function = log.additional_fields.get('telecom_metadata', {}).get('network_function', 'unknown')
                        
                        anomalies.append({
                            'log_id': log.id,
                            'timestamp': log.timestamp,
                            'level': log.level,
                            'message': log.message,
                            'service': log.service,
                            'telecom_metadata': log.additional_fields.get('telecom_metadata', {}),
                            'anomaly_type': 'pattern_match',
                            'severity': 'critical',
                            'pattern': pattern,
                            'description': f"{component_type} {network_function} critical issue"
                        })
                        
                        # Update anomaly patterns counter
                        pattern_key = f"{component_type}_{network_function}_{pattern}"
                        if pattern_key not in anomaly_patterns:
                            anomaly_patterns[pattern_key] = {
                                'count': 0,
                                'component': network_function,
                                'component_type': component_type,
                                'description': f"Pattern issue in {network_function}",
                                'severity': 'critical',
                                'pattern': pattern
                            }
                        anomaly_patterns[pattern_key]['count'] += 1
                        
                # Check warning patterns
                for pattern in self.telecom_anomaly_patterns['warning']:
                    if re.search(pattern, message_lower):
                        component_type = log.additional_fields.get('telecom_metadata', {}).get('component_type', 'telecom')
                        network_function = log.additional_fields.get('telecom_metadata', {}).get('network_function', 'unknown')
                        
                        anomalies.append({
                            'log_id': log.id,
                            'timestamp': log.timestamp,
                            'level': log.level,
                            'message': log.message,
                            'service': log.service,
                            'telecom_metadata': log.additional_fields.get('telecom_metadata', {}),
                            'anomaly_type': 'pattern_match',
                            'severity': 'warning',
                            'pattern': pattern,
                            'description': f"{component_type} {network_function} warning issue"
                        })
                        
                        # Update anomaly patterns counter
                        pattern_key = f"{component_type}_{network_function}_{pattern}"
                        if pattern_key not in anomaly_patterns:
                            anomaly_patterns[pattern_key] = {
                                'count': 0,
                                'component': network_function,
                                'component_type': component_type,
                                'description': f"Warning issue in {network_function}",
                                'severity': 'warning',
                                'pattern': pattern
                            }
                        anomaly_patterns[pattern_key]['count'] += 1
        
        # Convert anomaly patterns to list and sort by count
        anomaly_patterns_list = list(anomaly_patterns.values())
        anomaly_patterns_list.sort(key=lambda x: x['count'], reverse=True)
        
        return {
            "telecom_anomalies_count": len(anomalies),
            "telecom_anomalies": anomalies,
            "telecom_anomaly_patterns": anomaly_patterns_list
        }
        
    def generate_telecom_domain_knowledge(self) -> Dict[str, Any]:
        """Generate telecom domain knowledge
        
        Returns:
            Dictionary with telecom domain knowledge
        """
        # 5G Network Function relationships
        nf_relationships = {
            'AMF': ['SMF', 'UDM', 'AUSF', 'PCF', 'NSSF', 'NRF'],
            'SMF': ['AMF', 'UPF', 'PCF', 'UDM', 'NRF'],
            'UPF': ['SMF', 'PCF'],
            'PCF': ['AMF', 'SMF', 'UDM', 'NEF'],
            'UDM': ['AMF', 'SMF', 'AUSF', 'PCF', 'UDR'],
            'AUSF': ['AMF', 'UDM'],
            'NRF': ['AMF', 'SMF', 'UPF', 'PCF', 'UDM', 'AUSF', 'NSSF', 'NEF'],
            'NSSF': ['AMF', 'NRF'],
            'NEF': ['PCF', 'NRF'],
            'UDR': ['UDM', 'PCF']
        }
        
        # OpenRAN component relationships
        openran_relationships = {
            'O-RU': ['O-DU', 'eCPRI', 'Sync-Time', 'FH-Transport'],
            'O-DU': ['O-RU', 'O-CU-CP', 'O-CU-UP', 'Near-RT RIC', 'eCPRI', 'FH-Performance'],
            'O-CU-CP': ['O-DU', 'O-CU-UP', 'AMF', 'Near-RT RIC'],
            'O-CU-UP': ['O-DU', 'O-CU-CP', 'UPF', 'Near-RT RIC'],
            'Near-RT RIC': ['O-DU', 'O-CU-CP', 'O-CU-UP', 'Non-RT RIC', 'xApp'],
            'Non-RT RIC': ['Near-RT RIC', 'rApp', 'SMO'],
            'xApp': ['Near-RT RIC'],
            'rApp': ['Non-RT RIC'],
            'SMO': ['Non-RT RIC', 'O-DU', 'O-CU-CP', 'O-CU-UP', 'O-RU'],
            # New components
            'eCPRI': ['O-RU', 'O-DU', 'FH-Transport'],
            'Sync-Time': ['O-RU', 'O-DU', 'FH-Transport'],
            'FH-Performance': ['O-RU', 'O-DU', 'eCPRI', 'FH-Transport'],
            'FH-Transport': ['O-RU', 'O-DU', 'eCPRI', 'Sync-Time'],
            'O-RAN-FH-CUS': ['O-RU', 'O-DU', 'eCPRI'],
            'O-RAN-FH-FU': ['O-RU', 'O-DU', 'eCPRI', 'FH-Transport']
        }
        
        # 5G procedures and interfaces
        procedures_5g = {
            'registration': {
                'nfs': ['AMF', 'UDM', 'AUSF', 'PCF'],
                'interfaces': ['N1', 'N2', 'N8', 'N12', 'N5']
            },
            'authentication': {
                'nfs': ['AMF', 'AUSF', 'UDM'],
                'interfaces': ['N1', 'N12', 'N13']
            },
            'pdu_session_establishment': {
                'nfs': ['AMF', 'SMF', 'UPF', 'PCF', 'UDM'],
                'interfaces': ['N1', 'N2', 'N4', 'N7', 'N10', 'N11']
            },
            'handover': {
                'nfs': ['AMF', 'SMF'],
                'interfaces': ['N1', 'N2', 'N11']
            },
            'policy_control': {
                'nfs': ['PCF', 'AMF', 'SMF'],
                'interfaces': ['N5', 'N7', 'N15']
            }
        }
        
        # OpenRAN procedures and interfaces
        procedures_openran = {
            'cell_setup': {
                'components': ['O-DU', 'O-RU', 'O-CU-CP', 'O-CU-UP'],
                'interfaces': ['Open Fronthaul', 'F1-C', 'F1-U', 'E1']
            },
            'e2_subscription': {
                'components': ['Near-RT RIC', 'O-DU', 'O-CU-CP', 'O-CU-UP', 'xApp'],
                'interfaces': ['E2']
            },
            'xapp_control': {
                'components': ['Near-RT RIC', 'xApp', 'O-DU'],
                'interfaces': ['E2']
            },
            'rapp_policy': {
                'components': ['Non-RT RIC', 'rApp', 'Near-RT RIC'],
                'interfaces': ['A1']
            },
            'o1_management': {
                'components': ['SMO', 'O-DU', 'O-RU', 'O-CU-CP', 'O-CU-UP'],
                'interfaces': ['O1']
            },
            # eCPRI specific procedures
            'ecpri_one_way_delay': {
                'components': ['O-RU', 'O-DU', 'eCPRI'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            },
            'ecpri_framing': {
                'components': ['O-RU', 'O-DU', 'eCPRI'],
                'interfaces': ['eCPRI']
            },
            'ecpri_bandwidth_allocation': {
                'components': ['O-RU', 'O-DU', 'eCPRI', 'FH-Performance'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            },
            # Sync & Time procedures
            'ptp_synchronization': {
                'components': ['O-RU', 'O-DU', 'Sync-Time'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            },
            'clock_calibration': {
                'components': ['O-RU', 'Sync-Time'],
                'interfaces': ['Open Fronthaul']
            },
            # FH Performance procedures
            'performance_monitoring': {
                'components': ['O-RU', 'O-DU', 'FH-Performance'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            },
            # FH Transport procedures
            'transport_path_setup': {
                'components': ['O-RU', 'O-DU', 'FH-Transport'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            },
            # CUS procedures
            'cus_configuration': {
                'components': ['O-RU', 'O-DU', 'O-RAN-FH-CUS'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            },
            # FU procedures
            'fu_initialization': {
                'components': ['O-RU', 'O-DU', 'O-RAN-FH-FU'],
                'interfaces': ['eCPRI', 'Open Fronthaul']
            }
        }
        
        # Create the domain knowledge dictionary
        domain_knowledge = {
            'nf_relationships': nf_relationships,
            'openran_relationships': openran_relationships,
            '5g_procedures': procedures_5g,
            'openran_procedures': procedures_openran
        }
        
        return domain_knowledge