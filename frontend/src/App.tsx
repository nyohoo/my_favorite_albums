import { useEffect, useState } from 'react'
import { healthCheck } from './lib/api'

function App() {
  const [status, setStatus] = useState<string>('checking...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    healthCheck()
      .then((data) => {
        setStatus(`✅ ${data.message} (v${data.version})`)
      })
      .catch((err) => {
        setError(err.message)
        setStatus('❌ Connection failed')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">MyFavoriteAlbums</h1>
        <div className="space-y-2">
          <p className="text-gray-700">API Status: {status}</p>
          {error && (
            <p className="text-red-600 text-sm">
              Error: {error}
              <br />
              <span className="text-gray-500">
                Make sure the backend server is running on http://localhost:8787
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
