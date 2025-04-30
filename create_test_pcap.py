"""
Create a sample PCAP file for testing the telecom log analyzer.
"""
from scapy.layers.inet import IP, TCP, UDP
from scapy.layers.l2 import Ether
from scapy.packet import Raw
from scapy.utils import wrpcap
import random
import datetime

def create_sample_pcap(filename="test_telecom.pcap", packet_count=50):
    """Create a sample PCAP file with telecom-like packets"""
    packets = []
    
    # 5G Core services for source/destination
    services = [
        "192.168.1.10",  # AMF (Access and Mobility Management Function)
        "192.168.1.11",  # SMF (Session Management Function)
        "192.168.1.12",  # UPF (User Plane Function)
        "192.168.1.13",  # UDM (Unified Data Management)
        "192.168.1.14",  # AUSF (Authentication Server Function)
        "192.168.1.15",  # NRF (Network Repository Function)
        "10.20.0.50",    # gNodeB (5G Base Station)
        "10.20.0.51",    # gNodeB
        "192.168.1.20",  # PCF (Policy Control Function)
    ]
    
    # Common ports
    ports = [80, 443, 2152, 2123, 8080, 8443, 38412, 9090]
    
    # 5G message templates
    message_templates = [
        "NGAP PDU SessionEstablishment Request to UE",
        "NAS Authentication Request from AMF",
        "Received NG Setup Request from gNodeB",
        "UE Registration Request processed",
        "SM Policy Decision notification from PCF",
        "UE Context Release Command",
        "PDU Session Modification received",
        "Handover Required from source gNodeB",
        "Registration Accept sent to UE",
        "Authentication Response validated by AUSF",
        "PDU Session Resource Setup failed: timeout",
        "NRF service discovery completed",
        "Registration Reject: Illegal ME",
        "5G-AN to 5GC interface error: Invalid QoS profile"
    ]
    
    # Create random packets
    for i in range(packet_count):
        # Pick random source and destination from our services
        src = random.choice(services)
        dst = random.choice([s for s in services if s != src])
        
        # Choose random ports
        sport = random.choice(ports)
        dport = random.choice(ports)
        
        # 75% TCP, 25% UDP
        if random.random() < 0.75:
            # TCP packet
            packet = (Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") /
                      IP(src=src, dst=dst) /
                      TCP(sport=sport, dport=dport) /
                      Raw(load=random.choice(message_templates)))
        else:
            # UDP packet
            packet = (Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb") /
                      IP(src=src, dst=dst) /
                      UDP(sport=sport, dport=dport) /
                      Raw(load=random.choice(message_templates)))
        
        packets.append(packet)
    
    # Save to file
    wrpcap(filename, packets)
    print(f"Created {packet_count} packets in {filename}")
    return filename

if __name__ == "__main__":
    # Generate a test file in the uploads directory
    output_file = "uploads/documents/test_telecom.pcap"
    create_sample_pcap(output_file)