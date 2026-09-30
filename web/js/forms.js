/**
 * Forms built from the schema.
 *
 * A resource definition lists its fields (type, options, help, required …), so
 * one builder serves every module: student, meeting, dues payment, certificate,
 * user account. Reference fields (a student on a dues record, a course on an
 * enrolment) load their choices from /api/options/:resource.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon

  var optionCache = {}

  /**
   * Option sets come in two shapes: plain strings ('S1', 'Term 1') and objects
   * ({ value, label } — the session types). Everything that renders a dropdown
   * goes through this, so both work.
   */
  function optionPair(option) {
    if (option === null || option === undefined) return { value: '', label: '' }
    if (typeof option === 'object') return { value: String(option.value ?? option.key ?? ''), label: String(option.label ?? option.value ?? '') }
    return { value: String(option), label: String(option) }
  }

  async function optionsFor(resource) {
    if (!optionCache[resource]) {
      optionCache[resource] = ICT.api.options(resource).then((res) => (res && res.data) || [])
    }
    return optionCache[resource]
  }
  ICT.forms = { optionsFor, invalidateOptions: (resource) => delete optionCache[resource] }

  function label(field) {
    return el('label.field__label', { for: 'f-' + field.key }, [
      el('span', { text: field.label }),
      field.required ? el('span.req', { text: ' *' }) : null
    ])
  }

  function wrap(field, control) {
    return el('div.field' + (field.type === 'checkbox' ? '.field--checkbox' : ''), [
      field.type === 'checkbox' ? null : label(field),
      control,
      field.help ? el('div.field__help', { text: field.help }) : null,
      el('div.field__error', { dataset: { error: field.key } })
    ])
  }

  /**
   * One field. `getValue`/`setValue` are wired so the form can collect and
   * reset values without reading the DOM back.
   */
  function renderField(field, state) {
    var value = state.value
    var control
    switch (field.type) {
      case 'textarea':
        control = el('textarea.textarea', { id: 'f-' + field.key, rows: 4, placeholder: field.placeholder || '' })
        control.value = value || ''
        control.addEventListener('input', () => (state.value = control.value))
        break

      case 'select':
        control = el('select.select', { id: 'f-' + field.key })
        control.appendChild(el('option', { value: '', text: '— not set —' }))
        ;(field.options || []).map(optionPair).forEach((option) => control.appendChild(el('option', { value: option.value, text: option.label })))
        control.value = value === null || value === undefined ? '' : String(value)
        control.addEventListener('change', () => (state.value = control.value))
        break

      case 'ref': {
        control = el('select.select', { id: 'f-' + field.key })
        control.appendChild(el('option', { value: '', text: 'Loading…' }))
        control.disabled = true
        optionsFor(field.resource).then((options) => {
          control.disabled = false
          ICT.util.mount(control, [el('option', { value: '', text: '— select —' })])
          options.forEach((option) =>
            control.appendChild(el('option', { value: option.value, text: option.label + (option.sub ? ' · ' + option.sub : '') }))
          )
          control.value = value === null || value === undefined ? '' : String(value)
        })
        control.addEventListener('change', () => (state.value = control.value === '' ? null : Number(control.value)))
        break
      }

      case 'dynamicRef': {
        /* Meeting / activity / course / project — the type decides the list. */
        var typeControl = el('select.select', { id: 'f-' + field.key + '-type' })
        ;['meeting', 'activity', 'course', 'project'].forEach((type) =>
          typeControl.appendChild(el('option', { value: type, text: ICT.util.titleCase(type) }))
        )
        var refControl = el('select.select', { id: 'f-' + field.key + '-ref' })
        refControl.appendChild(el('option', { value: '', text: '— select —' }))
        var plural = { meeting: 'meetings', activity: 'activities', course: 'courses', project: 'projects' }
        function loadRefs(type) {
          refControl.disabled = true
          ICT.util.mount(refControl, [el('option', { value: '', text: 'Loading…' })])
          optionsFor(plural[type]).then((options) => {
            refControl.disabled = false
            ICT.util.mount(refControl, [el('option', { value: '', text: '— select —' })])
            options.forEach((option) =>
              refControl.appendChild(el('option', { value: option.value, text: option.label + (option.sub ? ' · ' + option.sub : '') }))
            )
            refControl.value = state.value && state.refType === type ? String(state.value) : ''
          })
        }
        typeControl.value = state.refType || 'meeting'
        loadRefs(typeControl.value)
        typeControl.addEventListener('change', () => {
          state.refType = typeControl.value
          state.value = null
          loadRefs(typeControl.value)
        })
        refControl.addEventListener('change', () => (state.value = refControl.value === '' ? null : Number(refControl.value)))
        control = el('div.ref-pair', [typeControl, refControl])
        break
      }

      case 'tags': {
        var chips = el('div.chip-input')
        var input = el('input', { id: 'f-' + field.key, placeholder: field.placeholder || 'Type and press Enter' })
        var values = String(value || '').split(',').map((v) => v.trim()).filter(Boolean)
        function refresh() {
          ICT.util.clear(chips)
          values.forEach((item, index) => {
            chips.appendChild(el('span.chip', [
              el('span', { text: item }),
              el('button', {
                type: 'button', title: 'Remove ' + item,
                onclick: () => {
                  values.splice(index, 1)
                  refresh()
                }
              }, [icon('x', 12)])
            ]))
          })
          chips.appendChild(input)
          state.value = values.join(', ')
        }
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            var text = input.value.trim().replace(/,$/, '')
            if (text) {
              values.push(text)
              input.value = ''
              refresh()
            }
          } else if (event.key === 'Backspace' && !input.value && values.length) {
            values.pop()
            refresh()
          }
        })
        input.addEventListener('blur', () => {
          var text = input.value.trim()
          if (text) {
            values.push(text)
            input.value = ''
            refresh()
          }
        })
        refresh()
        control = chips
        break
      }

      case 'checkbox': {
        var box = el('input', { type: 'checkbox', id: 'f-' + field.key })
        box.checked = Boolean(value)
        box.addEventListener('change', () => (state.value = box.checked))
        return wrap(field, el('label.checkbox', [box, el('span', { text: field.label })]))
      }

      default: {
        var type = { currency: 'number', percentage: 'number', number: 'number', date: 'date', time: 'time', email: 'email', url: 'url', tel: 'tel' }[field.type] || 'text'
        control = el('input.input', { id: 'f-' + field.key, type: type, placeholder: field.placeholder || '' })
        control.value = value === null || value === undefined ? '' : value
        if (field.type === 'currency' || field.type === 'number' || field.type === 'percentage') {
          control.step = 'any'
          control.inputMode = 'decimal'
          if (control.value === '') control.placeholder = field.type === 'percentage' ? 'e.g. 75' : '0'
        }
        control.addEventListener('input', () => {
          state.value = control.value
        })
        if (field.type === 'currency') {
          control = el('div.input-group', [el('span.input-group__prefix', { text: (ICT.store.settings && ICT.store.settings.currency) || 'UGX' }), control])
        }
        break
      }
    }
    return wrap(field, control)
  }

  /**
   * Builds the whole form.
   * Returns { form, collect, setErrors, focusFirst } — collect() reads current
   * values and returns { values, errors }.
   */
  function buildForm(resource, record, options) {
    options = options || {}
    var fields = (resource.fields || []).filter((field) => {
      if (field.readOnly && !record) return false
      if (options.only && !options.only.includes(field.key)) return false
      if (options.exclude && options.exclude.includes(field.key)) return false
      return true
    })

    var states = {}
    var nodes = []
    var currentGroup = null
    fields.forEach((field) => {
      var raw = record && record[field.key] !== undefined ? record[field.key] : field.default
      if (field.type === 'checkbox') raw = raw === undefined ? Boolean(field.default) : Boolean(raw)
      states[field.key] = { value: raw, refType: (record && record.ref_type) || field.defaultRefType || 'meeting' }
    })

    fields.forEach((field) => {
      /* Group headings keep long forms readable (a student has 20 fields). */
      if (field.formGroup && field.formGroup !== currentGroup) {
        currentGroup = field.formGroup
        nodes.push(el('div.form-section', [el('h3', { text: currentGroup })]))
      }
      nodes.push(renderField(field, states[field.key]))
    })

    var form = el('form.form-grid', { novalidate: true }, nodes)

    function collect() {
      var values = {}
      var errors = {}
      var refType = null
      fields.forEach((field) => {
        var state = states[field.key]
        var value = state.value
        if (field.type === 'checkbox') value = Boolean(value)
        else if (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') {
          value = value === '' || value === null || value === undefined ? null : Number(value)
          if (value !== null && !isFinite(value)) value = null
        } else if (field.type === 'ref' || field.type === 'dynamicRef') {
          value = value === '' || value === null || value === undefined ? null : Number(value)
          if (field.type === 'dynamicRef') refType = state.refType
        } else if (typeof value === 'string') value = value.trim()
        if (field.required && (value === null || value === undefined || value === '')) {
          errors[field.key] = field.label + ' is required'
        }
        if ((field.type === 'email' || field.type === 'url') && value) {
          var pattern = field.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/ : /^https?:\/\/.+/i
          if (!pattern.test(value)) errors[field.key] = 'Enter a valid ' + field.label.toLowerCase()
        }
        values[field.key] = value
      })
      if (refType) values.ref_type = refType
      return { values: values, errors: errors }
    }

    function setErrors(errors) {
      form.querySelectorAll('.field').forEach((node) => node.classList.remove('field--invalid'))
      form.querySelectorAll('.field__error').forEach((node) => (node.textContent = ''))
      Object.keys(errors || {}).forEach((key) => {
        var message = errors[key]
        var holder = form.querySelector(`[data-error="${key}"]`)
        if (holder) {
          holder.textContent = message
          holder.closest('.field').classList.add('field--invalid')
        }
      })
      var first = form.querySelector('.field--invalid input, .field--invalid select, .field--invalid textarea')
      if (first) first.focus()
    }

    return { form, collect, setErrors, states }
  }

  ICT.forms.optionPair = optionPair
  ICT.forms.renderField = renderField
  ICT.forms.buildForm = buildForm
})()
