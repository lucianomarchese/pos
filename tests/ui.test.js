import test from 'node:test';
import assert from 'node:assert/strict';
import { chips, segmented } from '../src/ui.js';

test('one-tap groups fall back to the first option when the remembered value no longer exists', () => {
  const methods = [['Tarjeta', 'Tarjeta'], ['Transferencia', 'Transferencia']];
  assert.match(segmented('paymentMethod', methods, 'Efectivo'), /value="Tarjeta" checked/);
  assert.match(chips('employeeId', [['emp-noa', 'Noa']], 'emp-mara'), /value="emp-noa" checked/);
  assert.match(segmented('paymentMethod', methods, 'Transferencia'), /value="Transferencia" checked/);
});
