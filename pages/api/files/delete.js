import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const bucket = process.env.SUPABASE_BUCKET || 'documents'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { path } = req.body || {}
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `path`' })
  }

  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
