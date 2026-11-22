(function () {
  var WHATSAPP = '966581919058';
  var MAIL_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxopY9X5NNPmJAQMyKnVxrk_Eif_HV2KqAP6y5OueJCnE-2njXvJda-IXYKB3NqXApp/exec';
  var areas = window.AREAS || [];
  var STAGES = window.STAGES || [];
  var form = document.getElementById('intake-form');
  var titleEl = document.getElementById('form-title');
  var current = null;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  function fieldsFor(area) {
    var common = [
      { id: 'name', label: 'الاسم الكامل', kind: 'text', required: true },
      { id: 'phone', label: 'رقم الجوال', kind: 'tel', required: true },
      { id: 'email', label: 'البريد الإلكتروني (اختياري)', kind: 'email' },
      { id: 'residence', label: 'مدينة الإقامة', kind: 'text', required: true },
      { id: 'caseType', label: 'نوع الدعوى أو الطلب', kind: 'select', options: area.caseTypes, required: true, full: true }
    ];
    if (area.key !== 'contracts') {
      common.push({ id: 'side', label: 'صفتك في الدعوى', kind: 'select', options: area.sides || ['مدعٍ', 'مدعى عليه', 'لم تُرفع بعد'] });
      common.push({ id: 'stage', label: 'مرحلة القضية', kind: 'select', options: area.stages || STAGES, required: true });
      common.push({ id: 'caseNo', label: 'رقم القضية (إن وجد)', kind: 'text' });
    }
    return common.concat(area.fields || [], [{ id: 'summary', label: 'ملخص الموضوع', kind: 'textarea', required: true, full: true }]);
  }

  function render(key) {
    current = areas.filter(function (a) { return a.key === key; })[0] || areas[0];
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === current.key); });
    titleEl.textContent = current.title;
    form.innerHTML = '';
    fieldsFor(current).forEach(function (f) {
      var wrap = el('label', { class: 'field' + (f.full || f.kind === 'textarea' ? ' full' : '') });
      var lab = el('span', null, f.label);
      if (f.required) { var r = el('span', { class: 'req' }, ' *'); lab.appendChild(r); }
      wrap.appendChild(lab);
      var input;
      if (f.kind === 'select') {
        input = el('select');
        input.appendChild(el('option', { value: '' }, 'اختر'));
        f.options.forEach(function (o) { input.appendChild(el('option', { value: o }, o)); });
      } else if (f.kind === 'textarea') {
        input = el('textarea', { rows: '5' });
      } else {
        input = el('input', { type: f.kind === 'tel' ? 'tel' : f.kind });
        if (f.kind === 'email' || f.kind === 'tel') input.setAttribute('dir', 'ltr');
      }
      input.name = f.id;
      input.dataset.label = f.label;
      if (f.required) input.dataset.required = '1';
      wrap.appendChild(input);
      form.appendChild(wrap);
    });
    var consent = el('label', { class: 'consent' });
    var cb = el('input', { type: 'checkbox', name: '__consent' });
    var span = el('span');
    span.appendChild(document.createTextNode('اطلعت على '));
    var a = el('a', { href: '/privacy', target: '_blank' }, 'سياسة الخصوصية');
    span.appendChild(a);
    span.appendChild(document.createTextNode('، وأوافق على معالجة بياناتي لغرض دراسة طلبي والتواصل معي.'));
    consent.appendChild(cb); consent.appendChild(span);
    form.appendChild(consent);
    var err = el('p', { class: 'form-error', id: 'form-error' });
    err.hidden = true;
    form.appendChild(err);
    var actions = el('div', { class: 'form-actions' });
    var btn = el('button', { type: 'submit', class: 'btn btn-solid' });
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg><span>إرسال الطلب عبر واتساب</span>';
    actions.appendChild(btn);
    actions.appendChild(el('p', { class: 'form-note' }, 'عند الضغط على «إرسال» يُفتح واتساب برسالة تتضمن بيانات الطلب، ويلزم الضغط على «إرسال» في واتساب لإتمامه. تعبئة النموذج لا تُنشئ علاقة توكيل، ويتواصل المكتب معك بعد دراسة الطلب.'));
    form.appendChild(actions);
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = document.getElementById('form-error');
    var inputs = Array.prototype.slice.call(form.querySelectorAll('input:not([type=checkbox]), select, textarea'));
    var missing = inputs.filter(function (i) { return i.dataset.required && !i.value.trim(); }).map(function (i) { return i.dataset.label; });
    if (missing.length) { err.textContent = 'يرجى تعبئة: ' + missing.join('، '); err.hidden = false; return; }
    if (!form.querySelector('input[name=__consent]').checked) { err.textContent = 'يلزم الموافقة على سياسة الخصوصية قبل الإرسال.'; err.hidden = false; return; }
    err.hidden = true;
    var lines = ['طلب خدمة – ' + current.title, ''];
    var get = function (n) { var x = form.querySelector('[name=' + n + ']'); return x ? x.value.trim() : ''; };
    inputs.forEach(function (i) {
      var v = i.value.trim();
      if (v) lines.push(i.dataset.label + ': ' + v);
    });
    var payload = { area: current.title, name: get('name'), phone: get('phone'), email: get('email'), caseType: get('caseType'), summary: get('summary'), text: lines.join('\n') };
    try {
      fetch(MAIL_ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }).catch(function () {});
    } catch (e) {}
    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  });

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { render(t.getAttribute('data-tab')); });
  });
  document.querySelectorAll('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      render(b.getAttribute('data-pick'));
      document.getElementById('intake').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  var fromHash = (location.hash || '').replace('#', '');
  render(areas.some(function (a) { return a.key === fromHash; }) ? fromHash : areas[0].key);
})();
