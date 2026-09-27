import { formatDate } from '../format'

/** Printable certificate. Themed by the club settings. */
export default function CertificateView({ record = {}, settings = {}, related }) {
  const clubName = settings?.club_name || 'ICT Club'
  const institution = settings?.institution || ''
  const body =
    record.description ||
    'in recognition of active participation, dedication and commitment to the activities of the club.'

  return (
    <div className="certificate">
      <div className="certificate__tag">{institution}</div>
      <div className="certificate__club mt-1">{clubName}</div>
      <div className="certificate__tag mt-1">{settings?.club_tagline || 'Innovate • Build • Share'}</div>

      <div className="certificate__type">{record.type || 'Certificate'} of recognition</div>

      <div className="certificate__rule" />

      <p className="small muted">This certificate is proudly presented to</p>
      <div className="certificate__name">{record.recipient_id_label || record.recipient_name || 'Recipient name'}</div>
      {record.recipient_class && <div className="small muted">Class: {record.recipient_class}</div>}
      {record.recipient_reg && <div className="small muted">Admission No: {record.recipient_reg}</div>}

      <div className="certificate__title mt-2">{record.title}</div>

      <p className="certificate__body">{body}</p>

      {related && (
        <p className="small muted">
          {related.title} {related.date ? `• ${formatDate(related.date)}` : ''}
        </p>
      )}

      {record.grade && (
        <p className="mt-2">
          <b>Grade / Award:</b> {record.grade}
        </p>
      )}

      <div className="certificate__signs">
        <div className="certificate__sign">
          <div className="certificate__sign-line">
            <b>{record.signed_by || 'Club Patron'}</b>
            <div className="small muted">Signature</div>
          </div>
        </div>
        <div className="certificate__sign">
          <div className="certificate__sign-line">
            <b>{record.issued_by || 'Club President'}</b>
            <div className="small muted">Issued by</div>
          </div>
        </div>
      </div>

      <div className="certificate__meta">
        <span>Certificate No: {record.certificate_no || '—'}</span>
        <span>Issued: {formatDate(record.issue_date)}</span>
        <span>Verify with: {record.verification_code || '—'}</span>
      </div>
    </div>
  )
}
