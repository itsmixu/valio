import { useEffect, useMemo, useRef, useState } from 'react'

type Stage = 'collect' | 'analyzing' | 'result' | 'error'

export type AnalysisResult = {
  looksLikeShipment: boolean
  missingItems: string[]
  confidence: number
  summary: string
  notes?: string
}

const CONFIDENCE_THRESHOLD = 0.7
const HELPLINE_NUMBER = '+358 45 49 11233'
const HELPLINE_TEL = '+358454911233'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return ''
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(value > 99 ? 0 : value > 9 ? 1 : 2)} ${sizes[i]}`
}

const formatConfidence = (value: number) =>
  `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return undefined
}

const toConfidence = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value > 1 ? value / 100 : value
    return Math.min(Math.max(normalized, 0), 1)
  }
  if (typeof value === 'string' && value.trim().length) {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      const normalized = numeric > 1 ? numeric / 100 : numeric
      return Math.min(Math.max(normalized, 0), 1)
    }
  }
  return 0
}

const unwrapPayload = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = unwrapPayload(entry)
      if (Object.keys(result).length > 0) {
        return result
      }
    }
    return {}
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const merged: Record<string, unknown> = { ...record }
    const nestedKeys = ['data', 'body', 'result', 'payload']
    for (const key of nestedKeys) {
      const nested = record[key]
      if (nested && typeof nested === 'object') {
        return { ...merged, ...unwrapPayload(nested) }
      }
    }
    return merged
  }

  return {}
}

const normalizeToAnalysis = (payload: unknown): AnalysisResult => {
  const base = unwrapPayload(payload)
  const working: Record<string, unknown> = { ...base }

  const nestedCandidates = ['analysis', 'output', 'response']
  for (const key of nestedCandidates) {
    const nested = working[key]
    if (nested && typeof nested === 'object') {
      Object.assign(working, nested as Record<string, unknown>)
    }
  }

  const confidenceFields = [
    working.confidence,
    working.confidenceThatPictureIsShipment,
    working.confidence_that_picture_is_shipment,
    working.confidencePictureShipment,
    working.confidenceScore,
    working.score,
    working.probability,
    working.confidence_value,
  ]

  let confidence = 0
  for (const field of confidenceFields) {
    const numeric = toConfidence(field)
    if (numeric > 0) {
      confidence = numeric
      break
    }
  }

  const flag =
    toBoolean(working.looksLikeShipment) ??
    toBoolean(working.isShipment) ??
    toBoolean(working.shipment) ??
    undefined

  const looksLikeShipment = flag ?? confidence >= 0.5

  const summaryCandidates = [
    working.summary,
    working.message,
    working.response,
    working.description,
  ]

  let summary = looksLikeShipment
    ? 'Lähetyskuva hyväksyttiin automaattisessa tarkistuksessa.'
    : 'Lähetyskuva saattaa vaatia manuaalista tarkistusta.'

  for (const candidate of summaryCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length) {
      summary = candidate.trim()
      break
    }
  }

  const notesCandidates = [working.notes, working.detail, working.notesText]
  let notes: string | undefined
  for (const candidate of notesCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length) {
      notes = candidate.trim()
      break
    }
  }

  return {
    looksLikeShipment,
    missingItems: [],
    confidence,
    summary,
    notes,
  }
}

const requestAnalysis = async (file: File): Promise<AnalysisResult> => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL

  if (!webhookUrl) {
    throw new Error(
      'VITE_N8N_WEBHOOK_URL puuttuu. Lisää n8n-webhook-osoite .env-tiedostoon.',
    )
  }

  const formData = new FormData()
  formData.append('file', file, file.name)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: formData,
  })

  const contentType = response.headers.get('content-type') ?? ''
  let payload: unknown
  let rawText: string | null = null

  if (contentType.includes('application/json')) {
    payload = await response.json()
  } else {
    rawText = await response.text()
    try {
      payload = JSON.parse(rawText)
    } catch (error) {
      if (!response.ok) {
        throw new Error(rawText || 'n8n-webhook palautti virheen.')
      }

      throw new Error(
        'Webhookilta odotettiin JSON-vastausta. Tarkista työnkulun ulostulo.',
      )
    }
  }

  if (!response.ok) {
    const payloadRecord =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {}
    const message =
      (typeof payloadRecord.error === 'string' && payloadRecord.error) ||
      (typeof payloadRecord.message === 'string' && payloadRecord.message) ||
      rawText ||
      `Webhook vastasi tilalla ${response.status}.`
    throw new Error(message)
  }

  return normalizeToAnalysis(payload)
}

const ImageCheckFlow = () => {
  const [stage, setStage] = useState<Stage>('collect')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isAnalyzing = stage === 'analyzing'

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  const fileMeta = useMemo(() => {
    if (!imageFile) return null
    return {
      name: imageFile.name,
      size: formatBytes(imageFile.size),
      type: imageFile.type,
    }
  }, [imageFile])

  const validateFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Lataa PNG-, JPG- tai WEBP-kuva.'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'Kuvan tulee olla alle 10 Mt.'
    }
    return null
  }

  const handleFileSelection = (list: FileList | null) => {
    const incomingFile = list?.item(0)
    if (!incomingFile) return

    const validationMessage = validateFile(incomingFile)
    if (validationMessage) {
      setError(validationMessage)
      setImageFile(null)
      setAnalysis(null)
      setStage('collect')
      return
    }

    setImageFile(incomingFile)
    setAnalysis(null)
    setError(null)
    void analyzeFile(incomingFile)
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files)
  }

  const whenReadySelect = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (stage === 'analyzing') return
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (stage === 'analyzing') return
    setIsDragging(false)
    handleFileSelection(event.dataTransfer.files)
  }

  const resetFlow = () => {
    setImageFile(null)
    setAnalysis(null)
    setError(null)
    setStage('collect')
  }

  const analyzeFile = async (file: File) => {
    setStage('analyzing')
    setError(null)
    setAnalysis(null)

    try {
      const result = await requestAnalysis(file)
      setAnalysis(result)
      setStage('result')
    } catch (analysisError) {
      console.error(analysisError)
      const message =
        analysisError instanceof Error
          ? analysisError.message
          : 'Kuvan tarkistuksessa ilmeni ongelma. Yritä uudelleen.'
      setError(message || 'Kuvan tarkistuksessa ilmeni ongelma. Yritä uudelleen.')
      setStage('error')
    }
  }

  const handleAnalyze = async () => {
    if (!imageFile) return
    await analyzeFile(imageFile)
  }

  const showHelpline =
    analysis?.looksLikeShipment && (analysis?.confidence ?? 0) >= CONFIDENCE_THRESHOLD

  return (
    <div className="image-flow">
      <div className="image-flow__card">
          <label
            htmlFor="shipment-upload"
            className={[
              'image-dropzone',
              previewUrl ? 'has-preview' : '',
              isDragging ? 'is-dragging' : '',
              isAnalyzing ? 'is-disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div className="image-preview">
                <img src={previewUrl} alt={fileMeta?.name ?? 'Valittu lähetys'} />
              </div>
            ) : (
              <div className="image-dropzone__prompt">
                <div className="image-dropzone__icon" aria-hidden="true">
                  📷
                </div>
                <p>Vedä ja pudota lähetyskuva</p>
                <span>Tai valitse tiedosto</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              id="shipment-upload"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileInputChange}
              disabled={isAnalyzing}
              hidden
            />
          </label>

          <div className="image-flow__details">
            {fileMeta ? (
              <div className="image-meta">
                <div>
                  <span className="image-meta__label">Valittu</span>
                  <strong>{fileMeta.name}</strong>
                </div>
                <span>{fileMeta.size}</span>
              </div>
            ) : (
              <p className="image-flow__hint">
                Tuemme PNG-, JPG- ja WEBP-kuvia kokoon 10 Mt asti. Selkeät ja hyvin
                valaistut lähetyskuvat toimivat parhaiten.
              </p>
            )}

            <div className="image-flow__actions">
              {stage === 'error' && (
                <>
                  {imageFile && (
                    <button
                      type="button"
                      className="support-button"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      Yritä AI-tarkistusta uudelleen
                    </button>
                  )}
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={whenReadySelect}
                    disabled={isAnalyzing}
                  >
                    Valitse toinen
                  </button>
                </>
              )}

              {isAnalyzing && (
                <div className="image-flow__status">
                  <span className="status-dot" />
                  Tarkistetaan kuvaa…
                </div>
              )}

              {stage === 'result' && analysis && (
                <button type="button" className="button-secondary" onClick={resetFlow}>
                  Aloita alusta
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="image-flow__message is-error">
              <strong>Tapahtui virhe.</strong>
              <span>{error}</span>
            </div>
          )}

          {stage === 'result' && analysis && (
            <section className="analysis-result" aria-live="polite">
              <header className="analysis-result__header">
                <div>
                  <span className="analysis-result__eyebrow">AI-tarkistuksen tulos</span>
                  <h3>{analysis.looksLikeShipment ? 'Lähetys tunnistettu' : 'Tarkista manuaalisesti'}</h3>
                </div>
                <div className="analysis-confidence">
                  <span className="analysis-confidence__value">
                    {formatConfidence(analysis.confidence)}
                  </span>
                  <span className="analysis-confidence__label">Varmuus</span>
                </div>
              </header>

              <div className="analysis-comment">
                <p className="analysis-summary">{analysis.summary}</p>
              </div>

              {analysis.notes && (
                <p className="analysis-notes">
                  {analysis.notes}
                </p>
              )}

              {showHelpline && (
                <div className="analysis-helpline">
                  <span className="analysis-helpline__label">Soita lähetyspalveluun:</span>
                  <a className="analysis-helpline__phone" href={`tel:${HELPLINE_TEL}`}>
                    Soita {HELPLINE_NUMBER}
                  </a>
                </div>
              )}
            </section>
          )}
      </div>
    </div>
  )
}

export default ImageCheckFlow

