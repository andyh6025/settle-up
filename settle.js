/**
 * Pure split and balance logic. No DOM, no storage — unit tested in
 * tests/settle.test.js.
 */

/**
 * Split a positive amount of cents evenly across participants.
 * Leftover cents go to the earliest participants, so the shares always
 * add up to the original amount.
 *
 * @param {number} amountCents positive integer
 * @param {string[]} participantIds one or more ids
 * @returns {{ id: string, amountCents: number }[]}
 */
export function splitExpense(amountCents, participantIds) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new TypeError('amountCents must be a positive integer');
  }
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new TypeError('participantIds must contain at least one id');
  }

  const ids = [...new Set(participantIds)];
  const base = Math.floor(amountCents / ids.length);
  const remainder = amountCents % ids.length;

  return ids.map((id, index) => ({
    id,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Net position per person: total paid minus total owed.
 * A positive balance means the person is owed money.
 *
 * Unknown payer or participant ids are ignored, so callers should pass a
 * sanitized roster and expenses (the app does this in loadState).
 *
 * @param {{ id: string, name: string }[]} people
 * @param {{ amountCents: number, payerId: string, participantIds: string[] }[]} expenses
 * @returns {{ id: string, name: string, paidCents: number, owedCents: number, balanceCents: number }[]}
 */
export function computeBalances(people, expenses) {
  const balances = new Map(
    people.map((person) => [
      person.id,
      {
        id: person.id,
        name: person.name,
        paidCents: 0,
        owedCents: 0,
        balanceCents: 0,
      },
    ])
  );

  for (const expense of expenses) {
    const payer = balances.get(expense.payerId);
    if (!payer) continue;

    payer.paidCents += expense.amountCents;

    for (const share of splitExpense(expense.amountCents, expense.participantIds)) {
      const participant = balances.get(share.id);
      if (participant) participant.owedCents += share.amountCents;
    }
  }

  return people.map((person) => {
    const entry = balances.get(person.id);
    return {
      ...entry,
      balanceCents: entry.paidCents - entry.owedCents,
    };
  });
}

/**
 * Greedy settlement plan: repeatedly have the largest debtor pay the largest
 * creditor. Produces at most (people - 1) transfers, and every balance ends
 * at zero.
 *
 * Ties are broken by name, then id, so the same household always produces the
 * same plan.
 *
 * @param {{ id: string, name: string }[]} people
 * @param {{ amountCents: number, payerId: string, participantIds: string[] }[]} expenses
 * @returns {{ fromId: string, fromName: string, toId: string, toName: string, amountCents: number }[]}
 */
export function settleUp(people, expenses) {
  const balances = computeBalances(people, expenses);

  const byAmountThenName = (a, b) =>
    b.amountCents - a.amountCents ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id);

  const debtors = balances
    .filter((balance) => balance.balanceCents < 0)
    .map((balance) => ({
      id: balance.id,
      name: balance.name,
      amountCents: -balance.balanceCents,
    }))
    .sort(byAmountThenName);

  const creditors = balances
    .filter((balance) => balance.balanceCents > 0)
    .map((balance) => ({
      id: balance.id,
      name: balance.name,
      amountCents: balance.balanceCents,
    }))
    .sort(byAmountThenName);

  const transfers = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.amountCents, creditor.amountCents);

    transfers.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: creditor.id,
      toName: creditor.name,
      amountCents,
    });

    debtor.amountCents -= amountCents;
    creditor.amountCents -= amountCents;

    if (debtor.amountCents === 0) debtorIndex += 1;
    if (creditor.amountCents === 0) creditorIndex += 1;
  }

  return transfers;
}
