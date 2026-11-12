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
