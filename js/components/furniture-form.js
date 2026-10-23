import { CATEGORIES, STATUSES } from '../config.js';
import { populateSelect } from '../utils/dom.js';
import { FORM_FIELDS, toFormValues } from '../utils/validation.js';

export function createFurnitureForm({ form, titleElement, ledeElement, submitButton, summaryElement, onSubmit }) {
  populateSelect(form.elements.namedItem('category'), CATEGORIES, 'Select a category');
  populateSelect(form.elements.namedItem('status'), STATUSES);

  const fields = Object.fromEntries(FORM_FIELDS.map((name) => {
    const input = form.elements.namedItem(name);
    return [name, { input, error: form.querySelector(`#error-${name}`), baseDescription: input.getAttribute('aria-describedby') ?? '' }];
  }));
  let submitLabel = 'Save furniture';

  const collectValues = () => Object.fromEntries(FORM_FIELDS.map((name) => [name, fields[name].input.value]));

  function clearFieldError(name) {
    const { input, error, baseDescription } = fields[name];
    input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', baseDescription);
    error.hidden = true;
    error.textContent = '';
  }

  function clearErrors() {
    FORM_FIELDS.forEach(clearFieldError);
    summaryElement.hidden = true;
    summaryElement.textContent = '';
  }

  function showErrors(errors) {
    const invalidNames = FORM_FIELDS.filter((name) => errors[name]);
    for (const name of invalidNames) {
      const { input, error, baseDescription } = fields[name];
      error.textContent = errors[name];
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${baseDescription} ${error.id}`.trim());
    }
    if (invalidNames.length === 0) return;
    summaryElement.textContent = `${invalidNames.length} ${invalidNames.length === 1 ? 'field needs' : 'fields need'} attention. Your other entries have been kept.`;
    summaryElement.hidden = false;
    fields[invalidNames[0]].input.focus();
  }

  function setBusy(isBusy) {
    form.setAttribute('aria-busy', String(isBusy));
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? 'Saving…' : submitLabel;
  }

  function fillValues(values) {
    for (const name of FORM_FIELDS) fields[name].input.value = values[name] ?? '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    setBusy(true);
    try {
      const result = await onSubmit(collectValues());
      if (result?.errors) showErrors(result.errors);
    } finally {
      setBusy(false);
    }
  });

  form.addEventListener('input', (event) => {
    const name = event.target.name;
    if (fields[name] && !fields[name].error.hidden) clearFieldError(name);
    if (FORM_FIELDS.every((fieldName) => fields[fieldName].error.hidden)) summaryElement.hidden = true;
  });

  return {
    setCreateMode() {
      clearErrors();
      form.reset();
      titleElement.textContent = 'Add furniture';
      ledeElement.textContent = 'Record a new piece. A unique ID is created automatically when you save.';
      submitLabel = 'Save furniture';
      submitButton.textContent = submitLabel;
    },
    setEditMode(record) {
      clearErrors();
      fillValues(toFormValues(record));
      titleElement.textContent = 'Edit furniture';
      ledeElement.textContent = `Editing ${record.id}. The ID stays the same when you save.`;
      submitLabel = 'Save changes';
      submitButton.textContent = submitLabel;
    },
  };
}
