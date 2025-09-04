import { useState } from 'react'

interface UseCallReturn {
  startCall: (to: string) => Promise<void>
  isCalling: boolean
  error: string | null
}

export function useCall(): UseCallReturn {
  const [isCalling, setIsCalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCall = async (to: string): Promise<void> => {
    try {
      setIsCalling(true)
      setError(null)

      const response = await fetch('/api/ringcentral/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Call failed')
      }

      // Call initiated successfully
      console.log('Call initiated:', data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to make call'
      setError(errorMessage)
      throw err
    } finally {
      setIsCalling(false)
    }
  }

  return {
    startCall,
    isCalling,
    error,
  }
}
