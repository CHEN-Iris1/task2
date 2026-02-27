import { useEffect, useState } from 'react'

const copy = {
  zh: {
    title: 'AI Summary App - 文件上传管理',
    languageToggle: 'English',
    chooseFile: '选择文件',
    upload: '上传到 Supabase',
    processing: '处理中...',
    uploadRequired: '请先选择一个文件',
    uploading: '上传中...',
    uploadSuccess: '上传成功',
    deleting: '删除中...',
    deleteSuccess: '删除成功',
    summarizeTextTitle: '文本摘要',
    summarizeTextPlaceholder: '粘贴文本后点击生成摘要',
    summarizeTextButton: '生成文本摘要',
    summarizeTextRequired: '请先输入要摘要的文本',
    summarizingText: 'AI 摘要生成中...',
    summarizeTextSuccess: '摘要生成成功',
    summaryTitle: '摘要结果',
    summaryEmpty: '暂无摘要',
    filesTitle: '文件列表',
    filesEmpty: '暂无文件',
    openFile: '打开文件',
    deleteFile: '删除',
    summarizeFile: '生成该文件摘要',
    summarizingFile: '正在读取文件并生成摘要...',
    summarizeFileSuccess: '文件摘要生成成功',
    fileSize: '大小',
    previousPage: '上一页',
    nextPage: '下一页',
    pageInfo: '第 {current} / {total} 页'
  },
  en: {
    title: 'AI Summary App - File Upload Manager',
    languageToggle: '中文',
    chooseFile: 'Choose File',
    upload: 'Upload to Supabase',
    processing: 'Processing...',
    uploadRequired: 'Please choose a file first',
    uploading: 'Uploading...',
    uploadSuccess: 'Upload successful',
    deleting: 'Deleting...',
    deleteSuccess: 'Delete successful',
    summarizeTextTitle: 'Text Summary',
    summarizeTextPlaceholder: 'Paste text and click to summarize',
    summarizeTextButton: 'Generate Text Summary',
    summarizeTextRequired: 'Please input text to summarize',
    summarizingText: 'Generating AI summary...',
    summarizeTextSuccess: 'Summary generated',
    summaryTitle: 'Summary Result',
    summaryEmpty: 'No summary yet',
    filesTitle: 'File List',
    filesEmpty: 'No files',
    openFile: 'Open File',
    deleteFile: 'Delete',
    summarizeFile: 'Summarize This File',
    summarizingFile: 'Reading file and generating summary...',
    summarizeFileSuccess: 'File summary generated',
    fileSize: 'Size',
    previousPage: 'Previous',
    nextPage: 'Next',
    pageInfo: 'Page {current} / {total}'
  }
}

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
  const [lang, setLang] = useState('zh')
  const [currentPage, setCurrentPage] = useState(1)

  const t = copy[lang]
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(files.length / pageSize))
  const pageStart = (currentPage - 1) * pageSize
  const paginatedFiles = files.slice(pageStart, pageStart + pageSize)
  const pageInfo = t.pageInfo
    .replace('{current}', String(currentPage))
    .replace('{total}', String(totalPages))

  async function refreshFiles() {
    const resp = await fetch('/api/files')
    const data = await readApiResponse(resp)
    const list = data.files || []
    setFiles(list)
    setCurrentPage(1)
  }

  useEffect(() => {
    refreshFiles().catch((err) => setMessage(err.message))
  }, [])

  async function handleUpload(event) {
    event.preventDefault()
    if (!selectedFile) {
      setMessage(t.uploadRequired)
      return
    }

    setLoading(true)
    setMessage(t.uploading)

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

      setMessage(t.uploadSuccess)
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
    setMessage(t.deleting)
    try {
      const resp = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      })
      await readApiResponse(resp)
      setMessage(t.deleteSuccess)
      await refreshFiles()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSummarizeText() {
    if (!inputText.trim()) {
      setMessage(t.summarizeTextRequired)
      return
    }

    setLoading(true)
    setMessage(t.summarizingText)
    try {
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      })
      const data = await readApiResponse(resp)
      setSummary(data.summary || '')
      setMessage(t.summarizeTextSuccess)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSummarizeFile(path) {
    setLoading(true)
    setMessage(t.summarizingFile)
    try {
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path })
      })
      const data = await readApiResponse(resp)
      setSummary(data.summary || '')
      setMessage(t.summarizeFileSuccess)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{t.title}</h1>
        <button type="button" onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} disabled={loading}>
          {t.languageToggle}
        </button>
      </header>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            disabled={loading}
            aria-label={t.chooseFile}
          />
          <button type="submit" disabled={loading || !selectedFile}>
            {loading ? t.processing : t.upload}
          </button>
        </form>
      </section>

      {message ? <p style={{ marginBottom: 16 }}>{message}</p> : null}

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{t.summarizeTextTitle}</h2>
        <textarea
          rows={6}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder={t.summarizeTextPlaceholder}
          style={{ width: '100%', maxWidth: '100%', padding: 8, boxSizing: 'border-box' }}
          disabled={loading}
        />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={handleSummarizeText} disabled={loading || !inputText.trim()}>
            {t.summarizeTextButton}
          </button>
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{t.summaryTitle}</h2>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap' }}>
          {summary || t.summaryEmpty}
        </div>
      </section>

      <h2>{t.filesTitle}</h2>
      {files.length === 0 ? (
        <p>{t.filesEmpty}</p>
      ) : (
        <>
          <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {paginatedFiles.map((file) => (
            <li
              key={file.name}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}
            >
              <strong>{file.name}</strong>
              <span>{t.fileSize}: {file.size} bytes</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={file.publicUrl} target="_blank" rel="noreferrer">
                  {t.openFile}
                </a>
                <button type="button" onClick={() => handleDelete(file.name)} disabled={loading}>
                  {t.deleteFile}
                </button>
                <button type="button" onClick={() => handleSummarizeFile(file.name)} disabled={loading}>
                  {t.summarizeFile}
                </button>
              </div>
            </li>
            ))}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={loading || currentPage <= 1}
            >
              {t.previousPage}
            </button>
            <span>{pageInfo}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={loading || currentPage >= totalPages}
            >
              {t.nextPage}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
