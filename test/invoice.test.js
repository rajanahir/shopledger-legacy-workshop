var test = require('node:test');
var assert = require('node:assert/strict');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

test('CURRENT BEHAVIOUR: order pricing applies the HSN slab and coupon to subtotal before tax', function () {
  var items = [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 1000, qty: 1 }];
  var totals = pricing.computeTotals(items, 'SAVE10');

  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.discount, 100);
  assert.equal(totals.taxable, 900);
  assert.equal(totals.tax, 45);
  assert.equal(totals.cgst, 22.5);
  assert.equal(totals.sgst, 22.5);
  assert.equal(totals.total, 945);
  assert.equal(totals.lines[0].gstPercent, 5);
});

test('CURRENT BEHAVIOUR: invoice recalculation defaults to 18% and discounts subtotal plus tax', function () {
  var order = {
    id: 1001,
    items: [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 1000, qty: 1 }],
    coupon: 'SAVE10',
    subtotal: 1000,
    discount: 100,
    tax: 45,
    total: 945
  };
  var figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.rows[0].gstPercent, 18);
  assert.equal(figures.rows[0].lineTax, 180);
  assert.equal(figures.subtotal, 1000);
  assert.equal(figures.tax, 180);
  assert.equal(figures.cgst, 90);
  assert.equal(figures.sgst, 90);
  assert.equal(figures.discount, 118);
  assert.equal(figures.total, 1062);
});

test('CURRENT BEHAVIOUR: rendered invoice shows aggregate GST and a ledger mismatch notice', function () {
  var html = invoice.render({
    id: 1001,
    date: '2026-11-21',
    status: 'completed',
    customer: 'Walk-in',
    paymentMode: 'cash',
    items: [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 1000, qty: 1 }],
    coupon: 'SAVE10',
    subtotal: 1000,
    discount: 100,
    tax: 45,
    total: 945
  });

  assert.match(html, /GST %<\/th><th class="r">GST Amt<\/th>/);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td class="r">.*180\.00/);
  assert.match(html, /Invoice Total<\/td><td class="r">.*1062\.00/);
  assert.match(html, /Invoice computed total/);
  assert.match(html, /Order Ledger recorded total/);
  assert.match(html, /differs from Order Ledger recorded total/);
  assert.doesNotMatch(html, /<td>CGST<\/td>|<td>SGST<\/td>/);
});
