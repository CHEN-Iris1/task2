import { useEffect, useState } from 'react'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function readApiResponse(resp) {
  const contentType = resp.headers.get('content-type') || ''
  const rawText = await resp.text()

  if (!contentType.includes('application/json')) {
    const snippet = rawText.slice(0, 120)
    throw new Error(`接口未返回 JSON（可能打开了错误端口）。当前响应片段: ${snippet}`)
  }

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error('接口返回内容不是有效 JSON，请确认通过 Next.js 本地地址访问页面')
  }

  if (!resp.ok) {
    throw new Error(data?.error || 'Request failed')
  }

  return data
}

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [inputText, setInputText] = useState('')
  const [summary, setSummary] = useState('')

  async function refreshFiles() {
    const resp = await fetch('/api/files')
    const data = await readApiResponse(resp)
    setFiles(data.files || [])
  }

  useEffect(() => {
    refreshFiles().catch((err) => setMessage(err.message))
  }, [])

  async function handleUpload(event) {
    event.preventDefault()
    if (!selectedFile) {
      setMessage('请先选择一个文件')
      return
    }

    setLoading(true)
    setMessage('上传中...')

    try {
      const fileBase64 = await fileToDataUrl(selectedFile)
      const resp = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileBase64,
          contentType: selectedFile.type
        })
      })

      await readApiResponse(resp)

      setMessage('上传成功')
      setSelectedFile(null)
      await refreshFiles()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(path) {
    setLoading(true)
    setMessage('删除中...')
    try {
      const resp = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      })
      await readApiResponse(resp)
      setMessage('删除成功')
      await refreshFiles()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSummarizeText() {
    if (!inputText.trim()) {
      setMessage('请先输入要摘要的文本')
      return
    }

    setLoading(true)
    setMessage('AI 摘要生成中...')
    try {
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      })
      const data = await readApiResponse(resp)
      setSummary(data.summary || '')
      setMessage('摘要生成成功')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSummarizeFile(path) {
    setLoading(true)
    setMessage('正在读取文件并生成摘要...')
    try {
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      })
      const data = await readApiResponse(resp)
      setSummary(data.summary || '')
      setMessage('文件摘要生成成功')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>AI Summary App - 文件上传管理</h1>

      <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !selectedFile}>
          {loading ? '处理中...' : '上传到 Supabase'}
        </button>
      </form>

      {message ? <p>{message}</p> : null}

      <section style={{ marginBottom: 20 }}>
        <h2>文本摘要</h2>
        <textarea
          rows={6}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="粘贴文本后点击生成摘要"
          style={{ width: '100%', maxWidth: '100%', padding: 8, boxSizing: 'border-box' }}
          disabled={loading}
        />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={handleSummarizeText} disabled={loading || !inputText.trim()}>
            生成文本摘要
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2>摘要结果</h2>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap' }}>
          {summary || '暂无摘要'}
        </div>
      </section>

      <h2>文件列表</h2>
      {files.length === 0 ? (
        <p>暂无文件</p>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
          {files.map((file) => (
            <li
              key={file.name}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}
            >
              <strong>{file.name}</strong>
              <span>大小: {file.size} bytes</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={file.publicUrl} target="_blank" rel="noreferrer">
                  打开文件
                </a>
                <button type="button" onClick={() => handleDelete(file.name)} disabled={loading}>
                  删除
                </button>
                <button type="button" onClick={() => handleSummarizeFile(file.name)} disabled={loading}>
                  生成该文件摘要
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
