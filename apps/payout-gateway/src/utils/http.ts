import https from 'https'

export const postJson = async <T>(
  targetUrl: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
) => {
  const body = JSON.stringify(payload)
  const url = new URL(targetUrl)

  return new Promise<T>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          const statusCode = res.statusCode ?? 500
          if (statusCode >= 200 && statusCode < 300) {
            try {
              resolve((data ? JSON.parse(data) : {}) as T)
            } catch (error) {
              reject(error)
            }
            return
          }

          reject(new Error(`HTTP POST failed with status ${statusCode}: ${data || 'No response body'}`))
        })
      },
    )

    request.on('error', reject)
    request.write(body)
    request.end()
  })
}
