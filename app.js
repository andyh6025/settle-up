const STORAGE_KEY = 'settle-up-state';

const els = {
  form: document.querySelector('#person-form'),
  input: document.querySelector('#name-input'),
  error: document.querySelector('#name-error'),
  roster: document.querySelector('#roster'),
  empty: document.querySelector('#roster-empty'),
};

function emptyState() {
  return { version: 1, people: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.people)) return emptyState();

    const people = parsed.people.filter(
      (person) =>
        person &&
        typeof person.id === 'string' &&
        typeof person.name === 'string'
    );

    return { version: 1, people };
  } catch {
    return emptyState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showError(message) {
  els.error.textContent = message;
  els.error.hidden = false;
  els.input.setAttribute('aria-invalid', 'true');
  els.input.focus();
}

function clearError() {
  els.error.textContent = '';
  els.error.hidden = true;
  els.input.removeAttribute('aria-invalid');
}

function render() {
  els.roster.replaceChildren();

  for (const person of state.people) {
    const item = document.createElement('li');
    item.className = 'roster-item';

    const name = document.createElement('span');
    name.className = 'roster-name';
    name.textContent = person.name;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-remove';
    remove.dataset.id = person.id;
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${person.name}`);

    item.append(name, remove);
    els.roster.append(item);
  }

  els.empty.hidden = state.people.length > 0;
}

function addPerson(rawName) {
  const name = rawName.trim();

  if (!name) {
    showError('Enter a name.');
    return;
  }

  const duplicate = state.people.some(
    (person) => person.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showError(`${name} is already on the list.`);
    return;
  }

  state.people.push({ id: makeId(), name });
  saveState(state);
  render();
  clearError();
  els.form.reset();
  els.input.focus();
}

function removePerson(id) {
  state.people = state.people.filter((person) => person.id !== id);
  saveState(state);
  render();
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  addPerson(els.input.value);
});

els.roster.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (button) removePerson(button.dataset.id);
});

els.input.addEventListener('input', () => {
  if (!els.error.hidden) clearError();
});

render();
