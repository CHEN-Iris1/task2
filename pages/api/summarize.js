import { supabaseAdmin } from '../../lib/supabaseAdmin'
import mammoth from 'mammoth'

const bucket = process.env.SUPABASE_BUCKET || 'documents'
const summaryTable = process.env.SUPABASE_SUMMARY_TABLE || 'document_summaries'

function buildPrompt(text) {
	return `请将下面内容总结为：\n1) 3-5条要点\n2) 一段不超过120字的摘要\n\n内容：\n${text}`
}

async function readTextFromStorage(path) {
	const { data, error } = await supabaseAdmin.storage.from(bucket).download(path)
	if (error) {
		throw new Error(error.message)
	}

	const lowerPath = path.toLowerCase()
	let text = ''

	if (lowerPath.endsWith('.docx')) {
		const arrayBuffer = await data.arrayBuffer()
		const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
		text = result.value || ''
	} else {
		text = await data.text()
	}

	if (!text || !text.trim()) {
		throw new Error('无法从该文件提取可读文本。若文档主要是图片/图表，请先转为可复制文本或使用 OCR。')
	}
	return text
}

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST')
		return res.status(405).json({ error: 'Method not allowed' })
	}

	const apiKey = process.env.AI_API_KEY
	const aiBaseUrl = (process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
	const aiModel = process.env.AI_MODEL || 'deepseek-chat'
	if (!apiKey) {
		return res.status(500).json({ error: 'AI_API_KEY not configured' })
	}

	const { text, filePath } = req.body || {}

	try {
		let sourceText = ''
		if (typeof text === 'string' && text.trim()) {
			sourceText = text.trim()
		} else if (typeof filePath === 'string' && filePath.trim()) {
			sourceText = await readTextFromStorage(filePath.trim())
		} else {
			return res.status(400).json({ error: 'Provide `text` or `filePath`' })
		}

		const response = await fetch(`${aiBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: aiModel,
				messages: [
					{ role: 'system', content: '你是一个严谨的中文文档摘要助手。' },
					{ role: 'user', content: buildPrompt(sourceText) }
				],
				temperature: 0.2
			})
		})

		if (!response.ok) {
			const errorText = await response.text()
			return res.status(502).json({ error: 'AI provider error', details: errorText })
		}

		const result = await response.json()
		const summary = result?.choices?.[0]?.message?.content || ''

		if (typeof filePath === 'string' && filePath.trim()) {
			const { error: dbError } = await supabaseAdmin
				.from(summaryTable)
				.update({ summary })
				.eq('storage_path', filePath.trim())

			if (dbError) {
				return res.status(500).json({ error: `Database update failed: ${dbError.message}` })
			}
		}

		return res.status(200).json({ summary })
	} catch (error) {
		return res.status(500).json({ error: error.message || 'Summarize failed' })
	}
}
