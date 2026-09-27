import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../icons'
import { api } from '../api'
import { useAuth } from '../auth'
import { useAsync } from '../hooks'
import { canWrite as schemaCanWrite, resourceByKey } from '../../../shared/schema'
import { Button, ConfirmDialog, EmptyState, Loading, Modal, useToast } from '../components/ui'
import RecordDetail from '../components/RecordDetail'
import RecordForm from '../components/RecordForm'
import CertificateView from '../components/CertificateView'

export default function RecordDetailPage() {
  const { resource: resourceKey, id } = useParams()
  const resource = resourceByKey(resourceKey)
  const navigate = useNavigate()
  const toast = useToast()
  const { user, settings } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data, loading, error, reload } = useAsync(() => api.get(resourceKey, id), [resourceKey, id, refreshKey])

  if (!resource) return <EmptyState icon="alert" title="Unknown section" />

  const back = (
    <div className="breadcrumb">
      <Link to={`/r/${resourceKey}`}>
        <Icon name="chevronLeft" size={12} /> Back to {resource.label}
      </Link>
    </div>
  )

  if (loading && !data) return <>{back}<Loading /></>
  if (error || !data) {
    return (
      <>
        {back}
        <EmptyState
          icon="alert"
          title={`${resource.singular} not found`}
          message={error || 'This record may have been deleted.'}
          action={<Button icon="chevronLeft" onClick={() => navigate(`/r/${resourceKey}`)}>Back to list</Button>}
        />
      </>
    )
  }

  const record = data.data
  const relations = data.relations || []
  const canWrite = schemaCanWrite(resource, user?.role) && !(resource.key === 'users' && user?.role !== 'admin')

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      await api.update(resourceKey, record.id, payload)
      toast.success(`${resource.singular} updated`)
      setEditing(false)
      reload()
    } catch (err) {
      toast.error('Could not save', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.remove(resourceKey, record.id)
      toast.success(`${resource.singular} deleted`)
      navigate(`/r/${resourceKey}`)
    } catch (err) {
      toast.error('Could not delete', err.message)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const extraActions = (
    <>
      {(resource.key === 'meetings' || resource.key === 'activities') && (
        <Button icon="check" onClick={() => navigate(`/attendance?ref_type=${resource.key === 'meetings' ? 'meeting' : 'activity'}&ref_id=${record.id}`)}>
          Attendance register
        </Button>
      )}
      {resource.key === 'courses' && (
        <Button icon="check" onClick={() => navigate(`/attendance?ref_type=course&ref_id=${record.id}`)}>
          Session attendance
        </Button>
      )}
      {resource.key === 'projects' && (
        <Button icon="checkSquare" onClick={() => navigate(`/r/project_tasks?project_id=${record.id}`)}>
          Tasks
        </Button>
      )}
      {resource.key === 'members' && (
        <Button icon="file" onClick={() => navigate(`/reports?member=${record.id}`)}>
          Statistics
        </Button>
      )}
      {resource.key === 'certificates' && (
        <>
          <Button icon="print" onClick={() => setPrintOpen(true)}>
            Preview &amp; print
          </Button>
          <Button icon="copy" onClick={() => copyVerifyLink(record, toast)}>
            Copy verify link
          </Button>
        </>
      )}
      {resource.key === 'courses' && (
        <Button
          icon="award"
          onClick={async () => {
            try {
              const result = await api.issueCertificates(record.id)
              toast.success(`${result.issued} certificate(s) issued`, result.skipped ? `${result.skipped} already had one` : undefined)
            } catch (err) {
              toast.error('Could not issue certificates', err.message)
            }
          }}
        >
          Issue certificates
        </Button>
      )}
      {resource.key === 'courses' && (
        <Button
          icon="userPlus"
          onClick={async () => {
            try {
              const result = await api.enrollCourse(record.id)
              toast.success(`${result.created} learner(s) enrolled`, result.skipped ? `${result.skipped} already enrolled` : undefined)
            } catch (err) {
              toast.error('Could not enrol learners', err.message)
            }
          }}
        >
          Enrol active members
        </Button>
      )}
    </>
  )

  return (
    <>
      {back}
      <RecordDetail
        resource={resource}
        record={record}
        relations={relations}
        currency={settings?.currency}
        extraActions={extraActions}
        onEdit={canWrite ? () => setEditing(true) : null}
        onDelete={canWrite ? () => setConfirmDelete(true) : null}
      />

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${resource.singular.toLowerCase()}`} subtitle={`Record #${record.id}`} size="lg">
        <RecordForm
          resource={resource}
          initial={record}
          submitting={saving}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${resource.singular.toLowerCase()}?`}
        message={`“${record[resource.titleKey] || `#${record.id}`}” will be permanently removed. This cannot be undone.`}
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      <Modal open={printOpen} onClose={() => setPrintOpen(false)} title="Certificate preview" subtitle={record.certificate_no} size="lg">
        <CertificateView record={record} settings={settings} />
        <div className="flex justify-end gap-1 mt-3 no-print">
          <Button icon="print" variant="primary" onClick={() => window.print()}>
            Print / save as PDF
          </Button>
        </div>
      </Modal>
    </>
  )
}

function copyVerifyLink(record, toast) {
  const url = `${window.location.origin}/verify?code=${encodeURIComponent(record.verification_code || record.certificate_no || '')}`
  navigator.clipboard
    ?.writeText(url)
    .then(() => toast.success('Verification link copied', url))
    .catch(() => toast.info('Verification code', record.verification_code || ''))
}
