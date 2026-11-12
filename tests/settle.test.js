import test from 'node:test';
import assert from 'node:assert/strict';

import { computeBalances, settleUp, splitExpense } from '../settle.js';

const people = [
  { id: 'a', name: 'Alex' },
  { id: 'b', name: 'Sam' },
  { id: 'c', name: 'Kim' },
];

test('splitExpense divides evenly when the amount divides cleanly', () => {
  assert.deepEqual(splitExpense(900, ['a', 'b', 'c']), [
    { id: 'a', amountCents: 300 },
    { id: 'b', amountCents: 300 },
    { id: 'c', amountCents: 300 },
  ]);
});

test('splitExpense gives leftover cents to the earliest participants', () => {
  assert.deepEqual(splitExpense(1000, ['a', 'b', 'c']), [
    { id: 'a', amountCents: 334 },
    { id: 'b', amountCents: 333 },
    { id: 'c', amountCents: 333 },
  ]);
});

test('splitExpense shares always sum to the original amount', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

  for (const amountCents of [1, 2, 7, 100, 4215, 999_999]) {
    for (let size = 1; size <= ids.length; size += 1) {
      const shares = splitExpense(amountCents, ids.slice(0, size));
      const total = shares.reduce((sum, share) => sum + share.amountCents, 0);

      assert.equal(total, amountCents, `${amountCents} across ${size}`);
      assert.equal(shares.length, size);
      assert.ok(
        shares.every(
          (share) =>
            Number.isSafeInteger(share.amountCents) && share.amountCents >= 0
        )
      );
    }
  }
});

test('splitExpense ignores duplicate participant ids', () => {
  assert.deepEqual(splitExpense(100, ['a', 'a', 'b']), [
    { id: 'a', amountCents: 50 },
    { id: 'b', amountCents: 50 },
  ]);
});

test('splitExpense rejects invalid input', () => {
  for (const bad of [0, -5, 1.5, '100', Number.NaN]) {
    assert.throws(() => splitExpense(bad, ['a']), TypeError);
  }

  for (const bad of [[], null, undefined]) {
    assert.throws(() => splitExpense(100, bad), TypeError);
  }
});

test('computeBalances splits a shared expense evenly', () => {
  const balances = computeBalances(people.slice(0, 2), [
    { amountCents: 1000, payerId: 'a', participantIds: ['a', 'b'] },
  ]);

  assert.deepEqual(balances, [
    { id: 'a', name: 'Alex', paidCents: 1000, owedCents: 500, balanceCents: 500 },
    { id: 'b', name: 'Sam', paidCents: 0, owedCents: 500, balanceCents: -500 },
  ]);
});

test('computeBalances lets a payer cover people who did not share', () => {
  const balances = computeBalances(people.slice(0, 2), [
    { amountCents: 1000, payerId: 'a', participantIds: ['b'] },
  ]);

  assert.equal(balances[0].balanceCents, 1000);
  assert.equal(balances[1].balanceCents, -1000);
});

test('computeBalances handles leftover cents and still sums to zero', () => {
  const balances = computeBalances(people, [
    { amountCents: 1000, payerId: 'a', participantIds: ['a', 'b', 'c'] },
  ]);

  assert.deepEqual(
    balances.map((balance) => balance.balanceCents),
    [666, -333, -333]
  );
  assert.equal(
    balances.reduce((sum, balance) => sum + balance.balanceCents, 0),
    0
  );
});

test('computeBalances returns zeros when there are no expenses', () => {
  const balances = computeBalances(people, []);

  assert.deepEqual(
    balances.map((balance) => balance.balanceCents),
    [0, 0, 0]
  );
  assert.ok(
    balances.every(
      (balance) => balance.paidCents === 0 && balance.owedCents === 0
    )
  );
});

test('computeBalances combines multiple expenses', () => {
  const balances = computeBalances(people, [
    { amountCents: 3000, payerId: 'a', participantIds: ['a', 'b', 'c'] },
    { amountCents: 900, payerId: 'b', participantIds: ['b', 'c'] },
  ]);

  assert.deepEqual(
    balances.map((balance) => balance.balanceCents),
    [2000, -550, -1450]
  );
  assert.equal(
    balances.reduce((sum, balance) => sum + balance.balanceCents, 0),
    0
  );
});

test('computeBalances keeps roster order and ignores unknown people', () => {
  const balances = computeBalances(people, [
    { amountCents: 300, payerId: 'a', participantIds: ['a', 'ghost'] },
  ]);

  assert.deepEqual(
    balances.map((balance) => balance.id),
    ['a', 'b', 'c']
  );
  assert.equal(balances[0].balanceCents, 150);
});

test('settleUp returns one payment for a simple shared expense', () => {
  const transfers = settleUp(people.slice(0, 2), [
    { amountCents: 1000, payerId: 'a', participantIds: ['a', 'b'] },
  ]);

  assert.deepEqual(transfers, [
    { fromId: 'b', fromName: 'Sam', toId: 'a', toName: 'Alex', amountCents: 500 },
  ]);
});

test('settleUp returns nothing when there is nothing to settle', () => {
  assert.deepEqual(settleUp(people, []), []);
  assert.deepEqual(
    settleUp(people.slice(0, 1), [
      { amountCents: 500, payerId: 'a', participantIds: ['a'] },
    ]),
    []
  );
});

test('settleUp pays the largest debt to the largest credit first', () => {
  const transfers = settleUp(people, [
    { amountCents: 3000, payerId: 'a', participantIds: ['a', 'b', 'c'] },
    { amountCents: 600, payerId: 'b', participantIds: ['b', 'c'] },
  ]);

  assert.deepEqual(transfers, [
    { fromId: 'c', fromName: 'Kim', toId: 'a', toName: 'Alex', amountCents: 1300 },
    { fromId: 'b', fromName: 'Sam', toId: 'a', toName: 'Alex', amountCents: 700 },
  ]);
  assert.equal(
    transfers.reduce((sum, transfer) => sum + transfer.amountCents, 0),
    2000,
    'payments add up to the total debt'
  );
});

test('settleUp handles uneven cents without losing a cent', () => {
  const transfers = settleUp(people, [
    { amountCents: 1000, payerId: 'a', participantIds: ['a', 'b', 'c'] },
  ]);

  assert.deepEqual(transfers, [
    { fromId: 'c', fromName: 'Kim', toId: 'a', toName: 'Alex', amountCents: 333 },
    { fromId: 'b', fromName: 'Sam', toId: 'a', toName: 'Alex', amountCents: 333 },
  ]);
  assert.equal(
    transfers.reduce((sum, transfer) => sum + transfer.amountCents, 0),
    666
  );
});

test('settleUp uses at most one payment per person', () => {
  const four = [...people, { id: 'd', name: 'Dee' }];
  const transfers = settleUp(four, [
    { amountCents: 4000, payerId: 'a', participantIds: ['a', 'b', 'c', 'd'] },
  ]);

  assert.equal(transfers.length, 3);
  assert.ok(transfers.length <= four.length - 1);
});

test('settleUp is deterministic when amounts tie', () => {
  const four = [
    { id: 'a', name: 'Ann' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Cat' },
    { id: 'd', name: 'Dan' },
  ];

  const transfers = settleUp(four, [
    { amountCents: 100, payerId: 'c', participantIds: ['a'] },
    { amountCents: 100, payerId: 'd', participantIds: ['b'] },
  ]);

  assert.deepEqual(transfers, [
    { fromId: 'a', fromName: 'Ann', toId: 'c', toName: 'Cat', amountCents: 100 },
    { fromId: 'b', fromName: 'Bob', toId: 'd', toName: 'Dan', amountCents: 100 },
  ]);
  assert.ok(transfers.every((transfer) => transfer.amountCents > 0));
});
