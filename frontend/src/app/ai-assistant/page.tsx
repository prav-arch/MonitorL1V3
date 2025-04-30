"use client";

import { useState, useRef, useEffect } from 'react';
import { Button, Card, Container, Form, Row, Col, Alert } from 'react-bootstrap';
import apiClient from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AnalysisResult {
  suggestion: string;
  confidence_score: number;
  relevant_logs: any[];
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Welcome to the Telecom AI Assistant! Ask me any questions about your telecom network logs or how to troubleshoot issues.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setError(null);

    try {
      // Send query to backend
      const response = await apiClient.analyzeTelecomLogs(input);
      const result: AnalysisResult = response;
      
      // Format relevant logs if available
      let formattedContent = result.suggestion;
      
      if (result.relevant_logs && result.relevant_logs.length > 0) {
        formattedContent += '\n\nRelevant Logs:';
        result.relevant_logs.forEach((log, index) => {
          formattedContent += `\n${index + 1}. [${log.level}] ${log.timestamp}: ${log.message}`;
        });
      }
      
      // Add assistant response to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: formattedContent,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error('Error analyzing logs:', err);
      setError('Failed to process your request. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format message content with line breaks
  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <Container fluid>
      <h1 className="page-title">AI Assistant</h1>
      <Card>
        <Card.Header>
          <h5 className="mb-0">Telecom Network Assistant</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <div className="chat-container">
                <div className="chat-messages">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
                    >
                      <div className="message-content">
                        {formatMessageContent(message.content)}
                      </div>
                      <div className="message-timestamp">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="chat-message assistant">
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef}></div>
                </div>
                
                {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                
                <Form onSubmit={handleSubmit} className="chat-input-form">
                  <Form.Group className="mb-0">
                    <div className="input-group">
                      <Form.Control
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your telecom network..."
                        disabled={isProcessing}
                      />
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={isProcessing || !input.trim()}
                      >
                        {isProcessing ? 'Processing...' : 'Send'}
                      </Button>
                    </div>
                  </Form.Group>
                </Form>
              </div>
            </Col>
            
            <Col md={4}>
              <Card className="suggestions-card">
                <Card.Header>
                  <h6 className="mb-0">Example Questions</h6>
                </Card.Header>
                <Card.Body>
                  <div className="suggestion-item" onClick={() => setInput('What are the most common errors in the 5G Core network?')}>
                    What are the most common errors in the 5G Core network?
                  </div>
                  <div className="suggestion-item" onClick={() => setInput('How do I troubleshoot AMF connectivity issues?')}>
                    How do I troubleshoot AMF connectivity issues?
                  </div>
                  <div className="suggestion-item" onClick={() => setInput('Show me all critical alerts in the OpenRAN components')}>
                    Show me all critical alerts in the OpenRAN components
                  </div>
                  <div className="suggestion-item" onClick={() => setInput('Analyze the performance of the UPF in the last hour')}>
                    Analyze the performance of the UPF in the last hour
                  </div>
                  <div className="suggestion-item" onClick={() => setInput('What could cause high latency in the 5G RAN?')}>
                    What could cause high latency in the 5G RAN?
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}