"""
Create a simple binary PCAP file for testing
"""
import os
import struct
import time

def create_simple_pcap(filename, num_packets=10):
    """Create a very simple PCAP file with minimal data for testing"""
    # PCAP global header (24 bytes)
    # Magic number (0xa1b2c3d4 standard, 0xa1b23c4d for nanosecond resolution)
    # Major version (2)
    # Minor version (4)
    # GMT to local time correction (0)
    # Accuracy of timestamps (0)
    # Max length of captured packets (65535)
    # Data link type (1 for Ethernet)
    pcap_header = struct.pack('IHHiIII',
                              0xa1b2c3d4, 2, 4, 0, 0, 65535, 1)
    
    with open(filename, 'wb') as f:
        f.write(pcap_header)
        
        # Create some minimal packet data
        for i in range(num_packets):
            # Get current time
            timestamp_sec = int(time.time())
            timestamp_usec = 0
            
            # Packet length (captured and actual)
            packet_len = 64  # Minimal Ethernet frame
            
            # Packet header (16 bytes)
            packet_header = struct.pack('IIII',
                                        timestamp_sec, timestamp_usec,
                                        packet_len, packet_len)
            
            # Create minimal Ethernet frame with 5G-related data
            src_mac = b'\x00\x11\x22\x33\x44\x55'
            dst_mac = b'\x66\x77\x88\x99\xAA\xBB'
            ethertype = b'\x08\x00'  # IPv4
            
            # Create minimal IPv4 header
            ip_header = bytes([
                0x45, 0x00,  # Version, IHL, DSCP, ECN
                0x00, 0x28,  # Total Length
                0x00, 0x00,  # Identification
                0x00, 0x00,  # Flags, Fragment Offset
                0x40, 0x06,  # TTL, Protocol (TCP)
                0x00, 0x00,  # Checksum (0 for simplicity)
                0xC0, 0xA8, 0x01, 0x0A,  # Source IP (192.168.1.10)
                0xC0, 0xA8, 0x01, 0x0B   # Dest IP (192.168.1.11)
            ])
            
            # Create minimal TCP header (20 bytes)
            tcp_header = bytes([
                0x13, 0x88, 0x21, 0x12,  # Source Port, Dest Port
                0x00, 0x00, 0x00, 0x00,  # Sequence Number
                0x00, 0x00, 0x00, 0x00,  # Acknowledgment Number
                0x50, 0x00, 0x00, 0x00,  # Header Length, Flags
                0x00, 0x00, 0x00, 0x00   # Window, Checksum, Urgent Pointer
            ])
            
            # Simple payload for our packet - a message identifier for telecom networks
            payload = b'5G-NAS-PDU-Session-Establishment-Request'
            
            # Pad to minimum Ethernet frame size if needed
            padding_len = max(0, packet_len - (14 + len(ip_header) + len(tcp_header) + len(payload)))
            padding = b'\x00' * padding_len
            
            # Combine all parts into a packet
            packet_data = src_mac + dst_mac + ethertype + ip_header + tcp_header + payload + padding
            
            # Write packet header and data
            f.write(packet_header)
            f.write(packet_data)
    
    print(f"Created simple PCAP file at {filename} with {num_packets} packets")
    return filename

if __name__ == "__main__":
    os.makedirs('uploads/documents', exist_ok=True)
    create_simple_pcap('uploads/documents/test_simple_telecom.pcap', 20)
    # Also create test_telecom.pcap for compatibility with existing code references
    create_simple_pcap('uploads/documents/test_telecom.pcap', 50)