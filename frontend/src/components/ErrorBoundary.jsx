import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('🛑 React render crash:', error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error?.message || String(this.state.error);
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#FFFDFA', color: '#1A1612',
        fontFamily: 'system-ui, sans-serif',
        padding: 32, overflow: 'auto',
      }}>
        <div style={{ maxWidth: 720, margin: '40px auto' }}>
          <div style={{
            display: 'inline-block', padding: '4px 10px',
            background: '#F4D8CC', color: '#8C2E1A',
            borderRadius: 999, fontSize: 12, fontWeight: 600,
          }}>App crashed</div>
          <h1 style={{ fontSize: 24, marginTop: 16, marginBottom: 8 }}>{msg}</h1>
          <p style={{ color: '#5C544A', fontSize: 14 }}>
            Open the browser console (F12) for the full stack — copy the first red error.
          </p>
          {this.state.info?.componentStack && (
            <pre style={{
              marginTop: 20, padding: 16, background: '#F5EEE3',
              borderRadius: 8, fontSize: 12, lineHeight: 1.5,
              whiteSpace: 'pre-wrap', overflowX: 'auto',
            }}>{this.state.info.componentStack}</pre>
          )}
          <button
            onClick={() => { this.setState({ error: null, info: null }); }}
            style={{
              marginTop: 20, padding: '10px 18px',
              background: '#B94A3B', color: '#FFF',
              border: 'none', borderRadius: 12, fontSize: 13, cursor: 'pointer',
            }}
          >Try again</button>
        </div>
      </div>
    );
  }
}
