"""
Telecom-specific RAG (Retrieval Augmented Generation) engine for 5G and OpenRAN logs.
This module extends the basic RAG engine with specialized knowledge and prompts
specific to telecom domain, particularly 5G and OpenRAN systems.
"""

import os
import json
from typing import Dict, List, Any, Optional
from utils.rag_engine import RAGEngine
from utils.telecom_processor import TelecomLogProcessor

# Telecom-specific context templates for LLM
TELECOM_CONTEXT_TEMPLATES = {
    "5g_core": """
You are a telecom expert specialized in 5G Core networks. 
You understand the 3GPP specifications and the interactions between different 
Network Functions (NFs) like AMF, SMF, UPF, PCF, UDM, AUSF, NRF, etc.

Context:
---
{context}
---

User query: {query}

Using the context above, provide a detailed analysis of the potential causes and 
recommended solutions for the issue. Include references to specific NFs, interfaces, 
or procedures where relevant. Structure your response with:
1. Problem identification
2. Potential causes 
3. Recommended troubleshooting steps
4. Solution recommendations
""",

    "openran": """
You are an OpenRAN expert specialized in O-RAN architecture.
You understand the O-RAN Alliance specifications and the interactions between 
components like O-CU, O-DU, O-RU, Near-RT RIC, xApps, and the involved interfaces.

Context:
---
{context}
---

User query: {query}

Using the context above, provide a detailed analysis of the potential causes and 
recommended solutions for the issue. Include references to specific O-RAN components, 
interfaces, or procedures where relevant. Structure your response with:
1. Problem identification
2. Potential causes 
3. Recommended troubleshooting steps
4. Solution recommendations
""",

    "5g_general": """
You are a 5G network expert with knowledge of both 5G Core and RAN.
You understand the end-to-end architecture, interfaces, and procedures in 5G networks.

Context:
---
{context}
---

User query: {query}

Using the context above, provide a detailed analysis of the potential causes and 
recommended solutions for the issue. Include references to specific components, 
interfaces, or procedures where relevant. Structure your response with:
1. Problem identification
2. Potential causes 
3. Recommended troubleshooting steps
4. Solution recommendations
"""
}


class TelecomRAGEngine:
    """Telecom-specific RAG engine for 5G and OpenRAN log analysis"""
    
    def __init__(self, base_rag_engine: RAGEngine, telecom_processor: TelecomLogProcessor):
        """Initialize the telecom RAG engine
        
        Args:
            base_rag_engine: The base RAG engine to extend
            telecom_processor: The telecom log processor
        """
        self.base_rag_engine = base_rag_engine
        self.telecom_processor = telecom_processor
        self.telecom_kb_path = os.path.join('data', 'telecom_kb')
        
        # Initialize telecom knowledge sources
        self._initialize_telecom_knowledge()
        
    def _initialize_telecom_knowledge(self) -> None:
        """Initialize telecom knowledge sources in the vector store"""
        # Process 5G knowledge
        self._load_knowledge_files(os.path.join(self.telecom_kb_path, '5g'))
        
        # Process OpenRAN knowledge
        self._load_knowledge_files(os.path.join(self.telecom_kb_path, 'openran'))
        
        # Add telecom domain knowledge
        self._add_telecom_domain_knowledge()
        
    def _load_knowledge_files(self, directory: str) -> None:
        """Load knowledge files from directory into vector store
        
        Args:
            directory: Directory containing knowledge files
        """
        if not os.path.exists(directory):
            return
            
        for filename in os.listdir(directory):
            if not filename.endswith('.txt'):
                continue
                
            filepath = os.path.join(directory, filename)
            
            try:
                with open(filepath, 'r') as f:
                    content = f.read()
                    
                # Process content into chunks (simple paragraph splitting for now)
                chunks = [chunk.strip() for chunk in content.split('\n\n') if chunk.strip()]
                
                # Add each knowledge chunk to vector store
                for i, chunk in enumerate(chunks):
                    # Skip very short chunks
                    if len(chunk) < 50:
                        continue
                        
                    # Create metadata for the knowledge chunk
                    metadata = {
                        'source': filepath,
                        'type': 'telecom_knowledge',
                        'domain': os.path.basename(directory),  # '5g' or 'openran'
                        'chunk_id': i,
                        'title': self._extract_title(chunk)
                    }
                    
                    # Skip if vector store is not initialized
                    if not self.base_rag_engine.vector_store.is_initialized():
                        continue
                        
                    # Add to vector store using a simple random vector (similar to base RAG engine)
                    try:
                        # Generate a simple random vector for embedding (384 dimensions for MiniLM-L6)
                        import numpy as np
                        embedding = np.random.rand(384).astype(np.float32)
                        
                        self.base_rag_engine.vector_store.add_vector(embedding, {
                            'text': chunk,
                            'metadata': metadata
                        })
                    except Exception as e:
                        print(f"Error adding telecom knowledge to vector store: {e}")
            except Exception as e:
                print(f"Error processing telecom knowledge file {filepath}: {e}")
                
    def _extract_title(self, text: str) -> str:
        """Extract a title from the text chunk
        
        Args:
            text: The text to extract title from
            
        Returns:
            Extracted title or a default one
        """
        # Check for markdown headings
        lines = text.split('\n')
        for line in lines[:2]:  # Check first two lines
            if line.startswith('# '):
                return line[2:].strip()
            elif line.startswith('## '):
                return line[3:].strip()
            elif line.startswith('### '):
                return line[4:].strip()
                
        # If no heading found, use first line or truncated text
        if lines:
            return lines[0][:50].strip()
        return "Telecom Knowledge"
        
    def _add_telecom_domain_knowledge(self) -> None:
        """Add structured telecom domain knowledge to vector store"""
        # Get domain knowledge from telecom processor
        domain_knowledge = self.telecom_processor.generate_telecom_domain_knowledge()
        
        # Convert structured knowledge to text chunks
        knowledge_chunks = self._convert_domain_knowledge_to_text(domain_knowledge)
        
        # Add each chunk to vector store
        for i, (title, text) in enumerate(knowledge_chunks):
            metadata = {
                'source': 'telecom_domain_knowledge',
                'type': 'structured_knowledge',
                'chunk_id': i,
                'title': title
            }
            
            # Skip if vector store is not initialized
            if not self.base_rag_engine.vector_store.is_initialized():
                continue
                
            # Add to vector store
            try:
                # Generate a simple random vector for embedding (similar to base RAG engine)
                import numpy as np
                embedding = np.random.rand(384).astype(np.float32)
                
                self.base_rag_engine.vector_store.add_vector(embedding, {
                    'text': text,
                    'metadata': metadata
                })
            except Exception as e:
                print(f"Error adding telecom domain knowledge to vector store: {e}")
                
    def _convert_domain_knowledge_to_text(self, domain_knowledge: Dict[str, Any]) -> List[tuple]:
        """Convert structured domain knowledge to text chunks
        
        Args:
            domain_knowledge: Structured domain knowledge
            
        Returns:
            List of (title, text) tuples
        """
        chunks = []
        
        # 5G NF relationships
        if 'nf_relationships' in domain_knowledge:
            text = "# 5G Network Function Relationships\n\n"
            for nf, related_nfs in domain_knowledge['nf_relationships'].items():
                text += f"## {nf}\n"
                text += f"Related to: {', '.join(related_nfs)}\n\n"
            chunks.append(("5G NF Relationships", text))
            
        # OpenRAN relationships
        if 'openran_relationships' in domain_knowledge:
            text = "# OpenRAN Component Relationships\n\n"
            for component, related_components in domain_knowledge['openran_relationships'].items():
                text += f"## {component}\n"
                text += f"Related to: {', '.join(related_components)}\n\n"
            chunks.append(("OpenRAN Component Relationships", text))
            
        # 5G procedures
        if '5g_procedures' in domain_knowledge:
            text = "# 5G Procedures and Interfaces\n\n"
            for procedure, info in domain_knowledge['5g_procedures'].items():
                text += f"## {procedure.capitalize()}\n"
                text += f"Network Functions: {', '.join(info['nfs'])}\n"
                text += f"Interfaces: {', '.join(info['interfaces'])}\n\n"
            chunks.append(("5G Procedures", text))
            
        # OpenRAN procedures
        if 'openran_procedures' in domain_knowledge:
            text = "# OpenRAN Procedures and Interfaces\n\n"
            for procedure, info in domain_knowledge['openran_procedures'].items():
                text += f"## {procedure.capitalize()}\n"
                text += f"Components: {', '.join(info['components'])}\n"
                text += f"Interfaces: {', '.join(info['interfaces'])}\n\n"
            chunks.append(("OpenRAN Procedures", text))
            
        return chunks
        
    def _detect_telecom_domain(self, query: str, context_logs: List[Dict[str, Any]]) -> str:
        """Detect which telecom domain the query and logs belong to
        
        Args:
            query: The user's query
            context_logs: The context logs
            
        Returns:
            Domain type: "5g_core", "openran", or "5g_general"
        """
        # Look for 5G Core terms in query
        core_terms = ['amf', 'smf', 'upf', 'udm', 'pcf', 'ausf', 'nrf', 'nssf', 'n1', 'n2', 'n3', 'n4',
                      '5g core', 'network function', 'network slice', 'registration', 'pdu session']
                      
        # Look for OpenRAN terms in query
        openran_terms = ['o-ru', 'o-du', 'o-cu', 'ric', 'xapp', 'rapp', 'openran', 'o-ran', 'fronthaul',
                         'e2', 'o1', 'a1', 'near-rt', 'non-rt', 'smo', 'service management']
                         
        # Count term occurrences in query and logs
        core_count = 0
        openran_count = 0
        
        # Check query
        query_lower = query.lower()
        for term in core_terms:
            if term in query_lower:
                core_count += 1
                
        for term in openran_terms:
            if term in query_lower:
                openran_count += 1
                
        # Check logs
        for log in context_logs:
            message = log.get('message', '').lower()
            
            # Count telecom terms in log message
            for term in core_terms:
                if term in message:
                    core_count += 1
                    
            for term in openran_terms:
                if term in message:
                    openran_count += 1
                    
            # Check for telecom metadata
            telecom_metadata = log.get('telecom_metadata', {})
            if telecom_metadata:
                component_type = telecom_metadata.get('component_type', '')
                if component_type == '5G':
                    core_count += 2
                elif component_type == 'OpenRAN':
                    openran_count += 2
        
        # Determine domain based on term counts
        if core_count > openran_count and core_count > 0:
            return "5g_core"
        elif openran_count > core_count and openran_count > 0:
            return "openran"
        else:
            return "5g_general"  # Default to general 5G
            
    def retrieve_telecom_context(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve telecom-specific context based on a query
        
        This combines log-based context with knowledge-based context
        
        Args:
            query: The user's query
            top_k: Number of context items to retrieve
            
        Returns:
            List of relevant context items (logs and knowledge)
        """
        # Get log-based context from base RAG engine
        log_context = self.base_rag_engine.retrieve_relevant_logs(query, top_k=top_k)
        
        # Process logs to extract telecom metadata if not already present
        enriched_logs = []
        for log in log_context:
            if 'telecom_metadata' not in log:
                # Convert to LogEntry
                from models import LogEntry
                log_entry = LogEntry.from_dict(log)
                
                # Enrich with telecom metadata
                enriched_log_entry = self.telecom_processor.enrich_log_entry(log_entry)
                
                # Convert back to dict
                enriched_logs.append(enriched_log_entry.to_dict())
            else:
                enriched_logs.append(log)
                
        # Retrieve knowledge-based context
        telecom_query = query + " 5G OpenRAN telecom"  # Enhance query with telecom terms
        knowledge_context = self._retrieve_telecom_knowledge(telecom_query, top_k=top_k)
        
        # Combine log context with knowledge context (prioritize logs)
        combined_context = enriched_logs + knowledge_context
        
        # Limit to top_k*2 items to avoid context overload
        return combined_context[:top_k*2]
        
    def _retrieve_telecom_knowledge(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve telecom knowledge based on a query
        
        Args:
            query: The query text
            top_k: Number of knowledge items to retrieve
            
        Returns:
            List of relevant knowledge items
        """
        # Skip if vector store is not initialized
        if not self.base_rag_engine.vector_store.is_initialized():
            return []
            
        try:
            # Generate a simple random vector for query embedding (similar to base RAG engine)
            import numpy as np
            query_embedding = np.random.rand(384).astype(np.float32)
            
            # Search vector store for similar vectors
            search_results = self.base_rag_engine.vector_store.search(query_embedding, k=top_k*2)
            
            # Filter for knowledge items only
            knowledge_items = []
            for result in search_results:
                metadata = result.get('metadata', {})
                
                # Only include telecom knowledge
                if metadata.get('type') in ['telecom_knowledge', 'structured_knowledge']:
                    knowledge_items.append({
                        'text': result.get('text', ''),
                        'source': metadata.get('source', 'telecom_knowledge'),
                        'title': metadata.get('title', 'Telecom Knowledge'),
                        'domain': metadata.get('domain', 'telecom'),
                        'score': result.get('score', 0.0)
                    })
                    
                # Limit to top_k items
                if len(knowledge_items) >= top_k:
                    break
                    
            return knowledge_items
        except Exception as e:
            print(f"Error retrieving telecom knowledge: {e}")
            return []
            
    def generate_telecom_suggestion(self, query: str, context: List[Dict[str, Any]]) -> str:
        """Generate a telecom-specific suggestion using the LLM
        
        Args:
            query: The user's query
            context: The combined context (logs and knowledge)
            
        Returns:
            A telecom-specific suggestion
        """
        if not context:
            return "Insufficient context to provide a telecom-specific suggestion."
            
        # Detect telecom domain
        domain = self._detect_telecom_domain(query, context)
        
        # Prepare context text
        context_text = self._prepare_telecom_context(context)
        
        # Get appropriate template
        template = TELECOM_CONTEXT_TEMPLATES.get(domain, TELECOM_CONTEXT_TEMPLATES["5g_general"])
        
        # Format prompt
        prompt = template.format(context=context_text, query=query)
        
        # Generate suggestion using LLM
        try:
            suggestion = self.base_rag_engine.llm_interface.generate_text(prompt)
            return suggestion
        except Exception as e:
            print(f"Error generating telecom suggestion: {e}")
            return f"Failed to generate telecom suggestion: {str(e)}"
            
    def _prepare_telecom_context(self, context: List[Dict[str, Any]]) -> str:
        """Prepare telecom context for the LLM prompt
        
        Args:
            context: The combined context (logs and knowledge)
            
        Returns:
            Formatted context text
        """
        # Separate logs and knowledge
        logs = [item for item in context if 'message' in item]
        knowledge = [item for item in context if 'text' in item]
        
        context_parts = []
        
        # Format logs
        if logs:
            context_parts.append("## Relevant Logs:")
            for i, log in enumerate(logs, 1):
                # Extract telecom metadata if available
                telecom_info = ""
                if 'telecom_metadata' in log:
                    metadata = log['telecom_metadata']
                    telecom_info = f" [{metadata.get('component_type', '')} - {metadata.get('network_function', '')}]"
                
                context_parts.append(f"{i}. [{log.get('level', 'INFO')}]{telecom_info} {log.get('message', '')}")
            context_parts.append("")
            
        # Format knowledge
        if knowledge:
            context_parts.append("## Relevant Knowledge:")
            for i, item in enumerate(knowledge, 1):
                context_parts.append(f"{i}. {item.get('title', 'Knowledge')}:")
                context_parts.append(item.get('text', ''))
                context_parts.append("")
                
        return "\n".join(context_parts)
        
    def analyze_telecom_logs(self, query: str, selected_logs: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze telecom logs based on query and generate suggestion
        
        Args:
            query: The user's query
            selected_logs: Optional list of user-selected logs
            
        Returns:
            Analysis result with telecom-specific information
        """
        # Retrieve relevant context combining logs and knowledge
        context = self.retrieve_telecom_context(query, top_k=5)
        
        # If specific logs were selected by the user, add them to the context
        if selected_logs:
            # Enrich selected logs with telecom metadata
            enriched_selected_logs = []
            for log in selected_logs:
                # Convert to LogEntry and enrich
                from models import LogEntry
                log_entry = LogEntry.from_dict(log)
                enriched_log_entry = self.telecom_processor.enrich_log_entry(log_entry)
                enriched_selected_logs.append(enriched_log_entry.to_dict())
                
            # Add to context
            context.extend(enriched_selected_logs)
            
        # Generate suggestion
        suggestion = self.generate_telecom_suggestion(query, context)
        
        # Detect telecom anomalies in context logs
        log_entries = []
        for log in context:
            if 'message' in log:
                # Convert dict to LogEntry
                from models import LogEntry
                log_entry = LogEntry.from_dict(log)
                log_entries.append(log_entry)
                
        # Get telecom anomaly information
        telecom_anomalies = {}
        if log_entries:
            telecom_anomalies = self.telecom_processor.detect_telecom_anomalies(log_entries)
        
        # Return analysis result
        return {
            "query": query,
            "suggestion": suggestion,
            "relevant_context": context,
            "telecom_anomalies": telecom_anomalies,
            "domain": self._detect_telecom_domain(query, context)
        }