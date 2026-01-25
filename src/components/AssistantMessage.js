import React from 'react';
import './AssistantMessage.css';

const AssistantMessage = ({ message }) => {
  const { role, content, data, timestamp } = message;
  
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const renderData = (data) => {
    if (!data) return null;
    
    const { rows, summary, metric, description, params, rowCount, latency, confidence, assumptions } = data;
    
    return (
      <div className="assistant-data">
        {/* Natural language summary */}
        {summary && (
          <div className="data-summary">
            <strong>📊 Summary:</strong> {summary}
          </div>
        )}
        
        {/* Data table */}
        {rows && rows.length > 0 && (
          <div className="data-table-container">
            <div className="data-table-header">
              <span className="table-title">{description || metric}</span>
              <span className="table-meta">{rowCount} rows • {latency}ms</span>
            </div>
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(rows[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((value, vidx) => (
                        <td key={vidx}>
                          {value !== null && value !== undefined ? String(value) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Metadata */}
        {(assumptions || confidence) && (
          <div className="data-metadata">
            {assumptions && (
              <div className="metadata-item">
                <span className="metadata-label">ℹ️ Assumptions:</span>
                <span className="metadata-value">{assumptions}</span>
              </div>
            )}
            {confidence && (
              <div className="metadata-item">
                <span className="metadata-label">Confidence:</span>
                <span className={`confidence-badge confidence-${confidence}`}>
                  {confidence}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`assistant-message ${role}`}>
      <div className="message-header">
        <span className="message-role">
          {role === 'user' ? '👤 You' : '🤖 Assistant'}
        </span>
        <span className="message-time">{formatTimestamp(timestamp)}</span>
      </div>
      <div className="message-content">
        {content}
      </div>
      {role === 'assistant' && renderData(data)}
    </div>
  );
};

export default AssistantMessage;
