/* ==========================================================================
   fields.js — builds a whole create/edit form from the schema.

   Every field type the schema uses is handled here: text, number, select,
   date, textarea, checkbox, a picker for linked records (students, meetings…)
   and the chip-style tag fields (skills, interests).

   The field inputs carry the id `f-<key>`, which is also what the tests use
   to fill a form, so keep that convention when adding new types.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon

  /** Option sets come as plain strings or as { value, label } — handle both. */
  function optionPair(option) {
    if (option === null || option === undefined) return { value: '', label: '' }
    if (typeof option === 'object') {
      return {
        value: String(option.value === undefined ? (option.key || '') : option.value),
        label: String(option.label === undefined ? (option.value || '') : option.label)
      }
    }
    return { value: String(option), label: String(option) }
  }

  function controlClasses(field) {
    if (field.type === 'textarea') return 'textarea'
    if (field.type === 'select' || field.type === 'ref' || field.type === 'dynamicRef') return 'select'
    return 'input'
  }

  /**
   * buildField(field, value, options)
   * Returns { node, read(), setValue(v), focus() }.
   * `options.resource` and `options.formState` are used by the picker fields.
   */
  function buildField(field, value, options) {
    options = options || {}
    var state = { value: value === undefined ? null : value }

    var node
    switch (field.type) {
      case 'textarea': {
        var textarea = el('textarea.textarea', { id: 'f-' + field.key, rows: field.rows || 4, placeholder: field.placeholder || '' })
        textarea.value = value === null || value === undefined ? '' : value
        textarea.addEventListener('input', function () { state.value = textarea.value })
        node = textarea
        break
      }

      case 'select': {
        var select = el('select.select', { id: 'f-' + field.key })
        if (!field.required) select.appendChild(el('option', { value: '', text: '— not set —' }))
        ;(field.options || []).map(optionPair).forEach(function (option) {
          select.appendChild(el('option', { value: option.value, text: option.label }))
        })
        select.value = value === null || value === undefined ? '' : String(value)
        select.addEventListener('change', function () { state.value = select.value })
        node = select
        break
      }

      case 'ref': {
        var refSelect = el('select.select', { id: 'f-' + field.key })
        refSelect.appendChild(el('option', { value: '', text: 'Loading…' }))
        refSelect.disabled = true
        ICT.api.options(field.resource).then(function (res) {
          var options2 = (res && res.data) || []
          ICT.mount(refSelect, [el('option', { value: '', text: '— select —' })])
          options2.forEach(function (option) {
            refSelect.appendChild(el('option', { value: option.value, text: option.label + (option.sub ? ' · ' + option.sub : '') }))
          })
          refSelect.disabled = false
          refSelect.value = value === null || value === undefined ? '' : String(value)
        }).catch(function () {
          ICT.mount(refSelect, [el('option', { value: '', text: 'Could not load the list' })])
        })
        refSelect.addEventListener('change', function () {
          state.value = refSelect.value === '' ? null : Number(refSelect.value)
        })
        node = refSelect
        break
      }

      case 'dynamicRef': {
        var plural = { meeting: 'meetings', activity: 'activities', course: 'courses', project: 'projects' }
        var typeSelect = el('select.select', { id: 'f-' + field.key + '-type' })
        ;['meeting', 'activity', 'course', 'project'].forEach(function (type) {
          typeSelect.appendChild(el('option', { value: type, text: ICT.titleCase(type) }))
        })
        var refList = el('select.select', { id: 'f-' + field.key + '-ref' })
        refList.appendChild(el('option', { value: '', text: '— select —' }))

        function loadRefs(type) {
          refList.disabled = true
          ICT.mount(refList, [el('option', { value: '', text: 'Loading…' })])
          ICT.api.options(plural[type]).then(function (res) {
            var options2 = (res && res.data) || []
            ICT.mount(refList, [el('option', { value: '', text: '— select —' })])
            options2.forEach(function (option) {
              refList.appendChild(el('option', { value: option.value, text: option.label + (option.sub ? ' · ' + option.sub : '') }))
            })
            refList.disabled = false
          }).catch(function () {
            ICT.mount(refList, [el('option', { value: '', text: 'Could not load the list' })])
          })
        }

        var chosenType = options.formState && options.formState[field.key + '_type'] ? options.formState[field.key + '_type'] : 'meeting'
        typeSelect.value = chosenType
        loadRefs(chosenType)
        typeSelect.addEventListener('change', function () {
          if (options.formState) options.formState[field.key + '_type'] = typeSelect.value
          state.value = null
          loadRefs(typeSelect.value)
        })
        refList.addEventListener('change', function () {
          state.value = refList.value === '' ? null : Number(refList.value)
        })
        node = el('div', { style: { display: 'grid', gap: '.4rem', gridTemplateColumns: '140px 1fr' } }, [typeSelect, refList])
        break
      }

      case 'tags': {
        var chips = el('div.chip-input')
        var input = el('input', { id: 'f-' + field.key, placeholder: field.placeholder || 'Type and press Enter' })
        var values = String(value || '').split(',').map(function (v) { return v.trim() }).filter(Boolean)

        function refresh() {
          ICT.mount(chips, values.map(function (item, index) {
            return el('span.chip', [
              el('span', { text: item }),
              el('button', {
                type: 'button', title: 'Remove ' + item,
                onclick: function () { values.splice(index, 1); refresh() }
              }, [icon('x', 12)])
            ])
          }))
          chips.appendChild(input)
          state.value = values.join(', ')
        }
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            var text = input.value.trim().replace(/,$/, '')
            if (text) { values.push(text); input.value = ''; refresh() }
          } else if (event.key === 'Backspace' && !input.value && values.length) {
            values.pop()
            refresh()
          }
        })
        input.addEventListener('blur', function () {
          var text = input.value.trim()
          if (text) { values.push(text); input.value = ''; refresh() }
        })
        refresh()
        node = chips
        break
      }

      case 'checkbox': {
        var box = el('input', { type: 'checkbox', id: 'f-' + field.key, checked: Boolean(value) })
        box.addEventListener('change', function () { state.value = box.checked })
        return { node: el('label.checkbox', [box, el('span', { text: field.placeholder || 'Yes' })]), read: function () { return box.checked }, setValue: function (v) { box.checked = Boolean(v); state.value = box.checked } }
      }

      case 'number': {
        var number = el('input.input', { id: 'f-' + field.key, type: 'number', value: value === null || value === undefined ? '' : value, placeholder: field.placeholder || '' })
        number.addEventListener('input', function () {
          state.value = number.value === '' ? null : Number(number.value)
        })
        node = number
        break
      }

      case 'date': {
        var date = el('input.input', { id: 'f-' + field.key, type: 'date', value: value ? String(value).slice(0, 10) : '' })
        date.addEventListener('change', function () { state.value = date.value || null })
        node = date
        break
      }

      case 'datetime': {
        var stamp = el('input.input', { id: 'f-' + field.key, type: 'datetime-local', value: value ? String(value).replace(' ', 'T').slice(0, 16) : '' })
        stamp.addEventListener('change', function () { state.value = stamp.value || null })
        node = stamp
        break
      }

      default: {
        var text = el('input.input', { id: 'f-' + field.key, type: field.type === 'email' ? 'email' : field.type === 'password' ? 'password' : 'text', value: value === null || value === undefined ? '' : value, placeholder: field.placeholder || '' })
        text.addEventListener('input', function () { state.value = text.value })
        node = text
      }
    }

    if (field.disabled) node.querySelectorAll && node.querySelectorAll('input, select, textarea').forEach(function (n) { n.disabled = true })

    return {
      node: node,
      read: function () {
        if (field.type === 'number' && state.value !== null && state.value !== '') return Number(state.value)
        return state.value
      },
      setValue: function (next) {
        state.value = next
        if (node.value !== undefined && field.type !== 'tags') node.value = next === null || next === undefined ? '' : next
      },
      focus: function () { if (node.focus) node.focus() }
    }
  }

  /**
   * formFields(resource, record, options)
   * Lays out the writable fields in schema order, with the form sections the
   * schema asks for. Returns { node, values(), isDirty() }.
   */
  function formFields(resource, record, options) {
    options = options || {}
    var built = []
    var nodes = []
    var sections = []
    var formState = options.formState || {}

    ;(resource.fields || []).forEach(function (field) {
      if (field.readOnly && !options.showReadOnly) return
      if (field.formGroup && sections.indexOf(field.formGroup) === -1) {
        sections.push(field.formGroup)
        nodes.push(el('div.form-section', [el('h3', { text: field.formGroup })]))
      }
      var control = buildField(field, record ? record[field.key] : field.default, {
        resource: resource,
        formState: formState,
        showReadOnly: options.showReadOnly
      })
      built.push({ field: field, control: control })
      nodes.push(ui.field(field.label + (field.required ? ' *' : ''), control.node, field.help))
    })

    // Anything the API sent that the schema no longer lists is offered too, so
    // a newly added column is never invisible.
    var known = {}
    ;(resource.fields || []).forEach(function (field) { known[field.key] = true })
    var loose = Object.keys(record || {}).filter(function (key) {
      return !known[key] && !/(^id$|_id$|created_at|updated_at|_count$)/.test(key) && record[key] !== null && typeof record[key] !== 'object'
    })
    if (loose.length && options.showExtra !== false) {
      nodes.push(el('div.form-section', [el('h3', { text: 'Other details' })]))
      loose.forEach(function (key) {
        var control = buildField({ key: key, label: ICT.titleCase(key), type: 'text' }, record[key], { formState: formState })
        built.push({ field: { key: key, label: ICT.titleCase(key) }, control: control })
        nodes.push(ui.field(ICT.titleCase(key), control.node))
      })
    }

    return {
      node: el('div.form-grid', nodes),
      controls: built,
      /** The payload to send. */
      values: function () {
        var payload = {}
        built.forEach(function (item) {
          var value = item.control.read()
          if (item.field.virtual) return
          payload[item.field.key] = value === undefined ? null : value
        })
        return payload
      },
      /** Reports the first missing required field, or null. */
      missing: function () {
        for (var i = 0; i < built.length; i += 1) {
          var field = built[i].field
          if (!field.required) continue
          var value = built[i].control.read()
          if (value === null || value === undefined || String(value).trim() === '') return field
        }
        return null
      },
      focusFirst: function () { if (built[0]) built[0].control.focus() }
    }
  }

  ICT.fields = { buildField: buildField, formFields: formFields, optionPair: optionPair }
})()
