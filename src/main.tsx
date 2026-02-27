import { StrictMode, Component, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Starting...')

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
    console.log('ErrorBoundary: constructor called')
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary: getDerivedStateFromError', error)
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      console.log('ErrorBoundary: Rendering error state', this.state)
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: 'red' }}>エラーが発生しました</h1>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto', textAlign: 'left' }}>
            {this.state.error?.toString()}
          </pre>
          {this.state.errorInfo && (
            <pre style={{ background: '#fff0f0', padding: '10px', overflow: 'auto', textAlign: 'left', marginTop: '10px' }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      )
    }
    console.log('ErrorBoundary: Rendering children')
    return this.props.children
  }
}

console.log('main.tsx: Creating root...')
const root = createRoot(document.getElementById('root')!)
console.log('main.tsx: Rendering...')
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
console.log('main.tsx: Done')
