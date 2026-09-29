import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../icons'
import { api } from '../api'
import { Badge, Button, Card } from '../components/ui'
import { formatDate } from '../format'

export default function VerifyPage() {
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') || '')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (value) => {
    if (!value) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const data = await api.verify(value)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Certificate not found')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const initial = params.get('code')
    if (initial) run(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="login-art__logo" style={{ width: 42, height: 42, fontSize: 15 }}>
            IC
          </div>
          <div>
            <h1 style={{ fontSize: 20 }}>Certificate verification</h1>
            <p className="small muted">Confirm that a certificate issued by the ICT Club is genuine.</p>
          </div>
        </div>

        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              run(code.trim())
            }}
          >
            <div className="field">
              <label className="field__label" htmlFor="code">
                Verification code or certificate number
              </label>
              <div className="flex gap-1">
                <input
                  id="code"
                  className="input"
                  placeholder="e.g. ICT-8A3F2C or ICTC/2026/0007"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button type="submit" variant="primary" loading={busy} icon="search">
                  Verify
                </Button>
              </div>
              <span className="field__help">The code is printed at the bottom of every certificate issued by the club.</span>
            </div>
          </form>

          {error && (
            <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
              <div className="card__body flex items-center gap-2">
                <Icon name="alert" size={18} />
                <div>
                  <div style={{ fontWeight: 620 }}>Not verified</div>
                  <div className="small">{error}</div>
                </div>
              </div>
            </div>
          )}

          {result?.valid && (
            <div className="card" style={{ borderColor: 'var(--green)', background: 'var(--green-soft)' }}>
              <div className="card__body">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="check" size={20} />
                  <div style={{ fontWeight: 650, fontSize: 15 }}>This certificate is authentic</div>
                </div>
                <div className="kv">
                  <div className="kv__k">Recipient</div>
                  <div className="kv__v">{result.certificate.recipient_name}</div>
                  <div className="kv__k">Registration number</div>
                  <div className="kv__v">{result.certificate.recipient_reg || '—'}</div>
                  <div className="kv__k">Certificate</div>
                  <div className="kv__v">{result.certificate.title}</div>
                  <div className="kv__k">Type</div>
                  <div className="kv__v">{result.certificate.type}</div>
                  <div className="kv__k">Certificate number</div>
                  <div className="kv__v">{result.certificate.certificate_no}</div>
                  <div className="kv__k">Issued on</div>
                  <div className="kv__v">{formatDate(result.certificate.issue_date)}</div>
                  <div className="kv__k">Grade / remark</div>
                  <div className="kv__v">{result.certificate.grade || '—'}</div>
                  <div className="kv__k">Issued by</div>
                  <div className="kv__v">
                    {result.certificate.issued_by} {result.certificate.signed_by ? `• signed by ${result.certificate.signed_by}` : ''}
                  </div>
                  <div className="kv__k">Status</div>
                  <div className="kv__v">
                    <Badge tone="green">{result.certificate.status}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && !result.valid && (
            <div className="card" style={{ borderColor: 'var(--red)' }}>
              <div className="card__body">
                <div className="flex items-center gap-2">
                  <Icon name="alert" size={18} />
                  <div>
                    <div style={{ fontWeight: 620 }}>This certificate has been revoked</div>
                    <div className="small muted">The certificate exists in the register but is no longer valid.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <p className="center small muted mt-3">
          <Link to="/" style={{ color: 'var(--brand)' }}>
            ← Back to the club management system
          </Link>
        </p>
      </div>
    </div>
  )
}
