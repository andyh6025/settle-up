const STORAGE_KEY = 'settle-up-state';

const els = {
  personForm: document.querySelector('#person-form'),
  nameInput: document.querySelector('#name-input'),
  nameError: document.querySelector('#name-error'),
  roster: document.querySelector('#roster'),
  rosterEmpty: document.querySelector('#roster-empty'),
  rosterError: document.querySelector('#roster-error'),
  expenseForm: document.querySelector('#expense-form'),
  expenseFields: document.querySelector('#expense-fields'),
  expenseHint: document.querySelector('#expense-hint'),
  description: document.querySelector('#expense-description'),
  amount: document.querySelector('#expense-amount'),
  payer: document.querySelector('#expense-payer'),
  participantList: document.querySelector('#participant-list'),
  expenseError: document.querySelector('#expense-error'),
  expenseList: document.querySelector('#expense-list'),
  expenseEmpty: document.querySelector('#expense-empty'),
};

let participantInputs = [];
let state = loadState();

function emptyState() {
  return { version: 1, people: [], expenses: [] };
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
    const ids = new Set(people.map((person) => person.id));

    const expenses = (Array.isArray(parsed.expenses) ? parsed.expenses : [])
      .filter(
        (expense) =>
          expense &&
          typeof expense.id === 'string' &&
          typeof expense.description === 'string' &&
          Number.isSafeInteger(expense.amountCents) &&
          expense.amountCents > 0 &&
          typeof expense.payerId === 'string' &&
          ids.has(expense.payerId) &&
          Array.isArray(expense.participantIds)
      )
      .map((expense) => ({
        ...expense,
        participantIds: expense.participantIds.filter((id) => ids.has(id)),
      }))
      .filter((expense) => expense.participantIds.length > 0);

    return { version: 1, people, expenses };
  } catch {
    return emptyState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `x-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseAmountToCents(raw) {
  const value = raw.trim();
  if (!value) return null;

  const valid = /^\$?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/.test(value);
  if (!valid) return null;

  const [whole, fraction = ''] = value.replace(/[$,]/g, '').split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));

  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearError(element) {
  element.textContent = '';
  element.hidden = true;
}

function renderRoster() {
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

  els.rosterEmpty.hidden = state.people.length > 0;
}

function renderExpenseControls() {
  els.payer.replaceChildren();
  for (const person of state.people) {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = person.name;
    els.payer.append(option);
  }

  els.participantList.replaceChildren();
  participantInputs = [];
  for (const person of state.people) {
    const label = document.createElement('label');
    label.className = 'check';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = person.id;
    box.checked = true;

    const name = document.createElement('span');
    name.textContent = person.name;

    label.append(box, name);
    els.participantList.append(label);
    participantInputs.push(box);
  }

  const noPeople = state.people.length === 0;
  els.expenseFields.disabled = noPeople;
  els.expenseHint.hidden = !noPeople;
}

function renderExpenses() {
  els.expenseList.replaceChildren();

  const names = new Map(state.people.map((person) => [person.id, person.name]));

  for (const expense of state.expenses) {
    const item = document.createElement('li');
    item.className = 'expense-item';

    const top = document.createElement('div');
    top.className = 'expense-top';

    const description = document.createElement('span');
    description.className = 'expense-desc';
    description.textContent = expense.description;

    const amount = document.createElement('span');
    amount.className = 'expense-amount';
    amount.textContent = formatCents(expense.amountCents);

    top.append(description, amount);

    const payerName = names.get(expense.payerId) ?? 'Unknown';
    const shared = expense.participantIds
      .map((id) => names.get(id))
      .filter(Boolean)
      .join(', ');

    const meta = document.createElement('p');
    meta.className = 'expense-meta';
    meta.textContent = `Paid by ${payerName} · Shared by ${shared}`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-remove';
    remove.dataset.id = expense.id;
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${expense.description}`);

    item.append(top, meta, remove);
    els.expenseList.append(item);
  }

  els.expenseEmpty.hidden = state.expenses.length > 0;
}

function render() {
  renderRoster();
  renderExpenseControls();
  renderExpenses();
}

function addPerson(rawName) {
  const name = rawName.trim();

  if (!name) {
    showError(els.nameError, 'Enter a name.');
    els.nameInput.setAttribute('aria-invalid', 'true');
    els.nameInput.focus();
    return;
  }

  const duplicate = state.people.some(
    (person) => person.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showError(els.nameError, `${name} is already on the list.`);
    els.nameInput.setAttribute('aria-invalid', 'true');
    els.nameInput.focus();
    return;
  }

  state.people.push({ id: makeId(), name });
  saveState();
  render();
  clearError(els.nameError);
  clearError(els.rosterError);
  els.nameInput.removeAttribute('aria-invalid');
  els.personForm.reset();
  els.nameInput.focus();
}

function removePerson(id) {
  const used = state.expenses.some(
    (expense) =>
      expense.payerId === id || expense.participantIds.includes(id)
  );

  if (used) {
    const person = state.people.find((candidate) => candidate.id === id);
    showError(
      els.rosterError,
      `${person ? person.name : 'That roommate'} is on an expense. Delete it first.`
    );
    return;
  }

  state.people = state.people.filter((person) => person.id !== id);
  saveState();
  clearError(els.rosterError);
  render();
}

function addExpense({ description, amount, payerId, participantIds }) {
  const cleanDescription = description.trim();
  if (!cleanDescription) {
    showError(els.expenseError, 'Enter a description.');
    els.description.focus();
    return;
  }

  const amountCents = parseAmountToCents(amount);
  if (amountCents === null) {
    showError(els.expenseError, 'Enter a positive amount like 12.50.');
    els.amount.focus();
    return;
  }

  const payerExists = state.people.some((person) => person.id === payerId);
  if (!payerExists) {
    showError(els.expenseError, 'Choose who paid.');
    return;
  }

  if (participantIds.length === 0) {
    showError(els.expenseError, 'Choose at least one roommate to share it.');
    return;
  }

  state.expenses.unshift({
    id: makeId(),
    description: cleanDescription,
    amountCents,
    payerId,
    participantIds,
    createdAt: new Date().toISOString(),
  });

  saveState();
  clearError(els.expenseError);
  els.description.value = '';
  els.amount.value = '';
  render();
  els.description.focus();
}

function removeExpense(id) {
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
}

els.personForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addPerson(els.nameInput.value);
});

els.roster.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (button) removePerson(button.dataset.id);
});

els.nameInput.addEventListener('input', () => {
  if (!els.nameError.hidden) {
    clearError(els.nameError);
    els.nameInput.removeAttribute('aria-invalid');
  }
});

els.expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addExpense({
    description: els.description.value,
    amount: els.amount.value,
    payerId: els.payer.value,
    participantIds: participantInputs
      .filter((input) => input.checked)
      .map((input) => input.value),
  });
});

els.expenseList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (button) removeExpense(button.dataset.id);
});

render();
