'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createAuthBrowserClient } from '@/lib/supabase/ssr-client'
import { createCraft, updateCraft } from '@/app/admin/actions'
import type { Craft } from '@/types'

const supabase = createAuthBrowserClient()

function slugify(name: string, type: string) {
  return `${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
}

export default function CraftForm({ craft }: { craft?: Craft }) {
  const isEdit = !!craft
  const router = useRouter()

  const [id,          setId]          = useState(craft?.id ?? '')
  const [name,        setName]        = useState(craft?.name ?? '')
  const [type,        setType]        = useState<'ski' | 'boat' | 'other'>(craft?.type ?? 'ski')
  const [classLabel,  setClassLabel]  = useState(craft?.class_label ?? '')
  const [description, setDescription] = useState(craft?.description ?? '')
  const [seats,       setSeats]       = useState(craft?.seats ?? 2)
  const [hourlyRate,  setHourlyRate]  = useState<number | ''>(craft?.hourly_rate ?? '')
  const [rateText,    setRateText]    = useState(craft?.rate ?? 'Hourly')
  const [totalUnits,  setTotalUnits]  = useState(craft?.total_units ?? 1)
  const [sortOrder,   setSortOrder]   = useState(craft?.sort_order ?? 0)
  const [active,      setActive]      = useState(craft?.active ?? true)
  const [imageUrl,    setImageUrl]    = useState<string | null>(craft?.image_url ?? null)

  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(craft?.image_url ?? null)
  const [uploading,    setUploading]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function onNameChange(val: string) {
    setName(val)
    if (!isEdit) setId(slugify(val, type))
  }
  function onTypeChange(val: 'ski' | 'boat' | 'other') {
    setType(val)
    if (!isEdit) setId(slugify(name, val))
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    let finalImageUrl = imageUrl

    // Upload image if a new file was selected
    if (imageFile) {
      setUploading(true)
      const ext = imageFile.name.split('.').pop() ?? 'jpg'
      const filename = `${id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('craft-images')
        .upload(filename, imageFile, { upsert: true, contentType: imageFile.type })
      setUploading(false)
      if (uploadErr) {
        setError(`Image upload failed: ${uploadErr.message}`)
        setSaving(false)
        return
      }
      finalImageUrl = supabase.storage.from('craft-images').getPublicUrl(filename).data.publicUrl
      setImageUrl(finalImageUrl)
    }

    const payload = {
      id, name, type, class_label: classLabel, description,
      seats: Number(seats), hourly_rate: hourlyRate === '' ? null : Number(hourlyRate),
      rate: rateText, total_units: Number(totalUnits),
      sort_order: Number(sortOrder), active, image_url: finalImageUrl,
    }

    const result = isEdit
      ? await updateCraft(craft!.id, payload)
      : await createCraft(payload)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push('/admin/crafts')
    router.refresh()
  }

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">{isEdit ? `Edit — ${craft!.name}` : 'New Item'}</h1>
      </div>
      <div className="adm-content" style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit} className="adm-form">
          {error && <p className="adm-error">{error}</p>}

          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label">ID (slug)</label>
              <input className="adm-input" value={id} onChange={e => setId(e.target.value)}
                required readOnly={isEdit} style={{ opacity: isEdit ? .5 : 1 }} />
            </div>
            <div className="adm-field">
              <label className="adm-label">Name</label>
              <input className="adm-input" value={name} onChange={e => onNameChange(e.target.value)} required />
            </div>
            <div className="adm-field">
              <label className="adm-label">Type</label>
              <select className="adm-select" value={type}
                onChange={e => onTypeChange(e.target.value as 'ski' | 'boat' | 'other')}>
                <option value="ski">Ski (Jet Ski)</option>
                <option value="boat">Boat</option>
                <option value="other">Other (Vehicle / Equipment)</option>
              </select>
            </div>
            <div className="adm-field">
              <label className="adm-label">Class label</label>
              <input className="adm-input" placeholder="HP / SPORT / CRUISE / WAKE"
                value={classLabel} onChange={e => setClassLabel(e.target.value)} required />
            </div>
            <div className="adm-field">
              <label className="adm-label">Seats</label>
              <input type="number" className="adm-input" min={1} max={20}
                value={seats} onChange={e => setSeats(Number(e.target.value))} required />
            </div>
            <div className="adm-field">
              <label className="adm-label">Hourly rate ($)</label>
              <input type="number" className="adm-input" min={0} step="0.01" placeholder="65.00"
                value={hourlyRate} onChange={e => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="adm-field">
              <label className="adm-label">Rate display text</label>
              <input className="adm-input" placeholder="Hourly"
                value={rateText} onChange={e => setRateText(e.target.value)} required />
            </div>
            <div className="adm-field">
              <label className="adm-label">Total units (qty owned)</label>
              <input type="number" className="adm-input" min={1}
                value={totalUnits} onChange={e => setTotalUnits(Number(e.target.value))} required />
            </div>
            <div className="adm-field">
              <label className="adm-label">Sort order</label>
              <input type="number" className="adm-input"
                value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} required />
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-label">Description</label>
            <input className="adm-input" value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <label className="adm-check">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            <span className="adm-label" style={{ margin: 0 }}>Active (visible on public site)</span>
          </label>

          {/* Image upload */}
          <div className="adm-field">
            <label className="adm-label">Photo</label>

            {imagePreview && (
              <Image src={imagePreview} alt="preview" width={560} height={220}
                style={{ objectFit: 'cover', width: '100%', height: 220, display: 'block', marginBottom: '.5rem' }} />
            )}

            <div className="adm-upload-area" style={{ padding: '1rem' }}>
              <p className="adm-upload-hint">
                {uploading ? 'Uploading…' : imagePreview ? 'Replace photo' : 'JPEG · PNG · WebP · max 5 MB'}
              </p>
              <div className="adm-upload-btns">
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm"
                  onClick={() => fileRef.current?.click()}>
                  Choose file
                </button>
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm"
                  onClick={() => cameraRef.current?.click()}>
                  Take photo
                </button>
              </div>
            </div>

            {/* Standard file picker */}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }} onChange={onFileSelect} />
            {/* Camera capture — opens rear camera on mobile */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }} onChange={onFileSelect} />
          </div>

          <div className="adm-actions-row" style={{ marginTop: '.5rem' }}>
            <button type="submit" className="adm-btn" disabled={saving || uploading}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create item'}
            </button>
            <button type="button" className="adm-btn adm-btn-ghost"
              onClick={() => router.push('/admin/crafts')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
