import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const bucket = process.env.SUPABASE_BUCKET || 'documents'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list('', { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const files = (data || []).map((item) => {
    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(item.name)
    return {
      name: item.name,
      size: item.metadata?.size || 0,
      updatedAt: item.updated_at,
      publicUrl: publicData.publicUrl
    }
  })

  return res.status(200).json({ files })
}
