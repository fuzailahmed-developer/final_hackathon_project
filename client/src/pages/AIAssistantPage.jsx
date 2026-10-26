import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../api/client';
import {
  Sparkles,
  Send,
  User,
  Bot,
  Clock,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export const AIAssistantPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${user?.name || ''}! I am your HCM Lite AI Assistant. You are signed in with the **${role.toUpperCase()}** role. How can I assist you with your workforce operations, attendance, leaves, or company policies today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolsUsed: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Suggested prompts based on authenticated role
  const suggestedPrompts = {
    admin: [
      'How many active employees are in Engineering?',
      'What is this month\'s finalized payroll cost?',
      'Who came late most often?',
      'What time does the office start?'
    ],
    hr: [
      'How many employees are on leave today?',
      'What is today\'s attendance rate?',
      'Who came late most often?',
      'How many active employees are in Engineering?'
    ],
    employee: [
      'How many sick leaves do I have left?',
      'How many times was I late this month?',
      'Show my latest payslip.',
      'What is David\'s salary?'
    ]
  };

  const rolePrompts = suggestedPrompts[role] || suggestedPrompts.employee;

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setErrorMessage('');
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(text);
      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.answer || 'I could not generate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolsUsed: res.toolsUsed || []
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setErrorMessage(err.message || 'AI assistant is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', height: 'calc(100vh - 120px)' }}>
      <PageHeader
        title="HCM Assistant"
        description="Permission-aware conversational assistant for workforce analytics, attendance, policies, and personal records."
        actions={
          <Badge variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}>
            <Sparkles size={13} />
            AI-generated
          </Badge>
        }
      />

      {/* Chat Container Card */}
      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Messages Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: '12px'
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary-600)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      fontSize: '11px',
                      color: 'var(--neutral-400)'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{isUser ? 'You' : 'HCM Assistant'}</span>
                    <span>• {m.timestamp}</span>
                    {!isUser && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 500
                        }}
                      >
                        AI-generated
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: isUser ? 'var(--primary-600)' : 'var(--neutral-100, #f1f5f9)',
                      color: isUser ? '#ffffff' : 'var(--neutral-900)',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxShadow: isUser ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {m.text}
                  </div>

                  {/* Tool transparency indicator */}
                  {!isUser && m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        fontSize: '11px',
                        color: 'var(--neutral-500)'
                      }}
                    >
                      <CheckCircle2 size={12} color="var(--success-600)" />
                      <span>Verified using: {m.toolsUsed.join(', ')}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--neutral-200)',
                      color: 'var(--neutral-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-600)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px 14px 14px 2px',
                  backgroundColor: 'var(--neutral-100, #f1f5f9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--neutral-500)'
                }}
              >
                <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Checking records and reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderTop: '1px solid #fecaca'
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Suggested Prompts Pill Row */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--neutral-200, #e2e8f0)',
            backgroundColor: 'var(--neutral-50, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HelpCircle size={13} /> Suggested:
          </span>
          {rolePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '14px',
                border: '1px solid var(--neutral-300, #cbd5e1)',
                backgroundColor: '#ffffff',
                color: 'var(--neutral-700)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Composer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--neutral-200, #e2e8f0)', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a question as ${role.toUpperCase()}...`}
              disabled={loading}
              style={{ flex: 1, height: '42px', fontSize: '14px' }}
            />
            <Button
              variant="primary"
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              icon={<Send size={15} />}
              style={{ height: '42px', padding: '0 18px' }}
            >
              Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistantPage;
