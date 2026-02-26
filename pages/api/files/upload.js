import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const bucket = process.env.SUPABASE_BUCKET || 'documents'

function parseBase64(input) {
  if (typeof input !== 'string') return null
  const data = input.includes(',') ? input.split(',')[1] : input
  return Buffer.from(data, 'base64')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { fileName, fileBase64, contentType } = req.body || {}
  if (!fileName || !fileBase64) {
    return res.status(400).json({ error: 'Missing fileName or fileBase64' })
  }

  const fileBuffer = parseBase64(fileBase64)
  if (!fileBuffer || fileBuffer.length === 0) {
    return res.status(400).json({ error: 'Invalid fileBase64' })
  }

  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${Date.now()}-${safeName}`

  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, fileBuffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return res.status(200).json({ path, publicUrl: data.publicUrl, fileName })
}
