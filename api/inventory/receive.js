/**
 * POST /api/inventory/receive
 *
 * Receives an inbound stock delivery for a SKU (the same flow as the Everlast platform):
 *   1. Inbound quantity fills pending pre-orders first, oldest first (FIFO).
 *   2. Whatever is left over (surplus) is released to available stock and
 *      split across warehouse locations by their allocation share.
 *
 * Invalid input returns a 422 response shaped like a Laravel validation error.
 */

function validate(body) {
  const errors = {};
  const add = (field, msg) => { (errors[field] = errors[field] || []).push(msg); };

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    add('body', 'The request body must be a JSON object.');
    return errors;
  }

  if (typeof body.sku !== 'string' || !body.sku.trim()) add('sku', 'The sku field is required.');
  else if (body.sku.length > 64) add('sku', 'The sku may not be greater than 64 characters.');

  if (!Number.isInteger(body.inbound_qty)) add('inbound_qty', 'The inbound qty must be an integer.');
  else if (body.inbound_qty < 1 || body.inbound_qty > 1000000) add('inbound_qty', 'The inbound qty must be between 1 and 1000000.');

  if (body.preorders !== undefined) {
    if (!Array.isArray(body.preorders)) add('preorders', 'The preorders must be an array.');
    else if (body.preorders.length > 100) add('preorders', 'The preorders may not have more than 100 items.');
    else body.preorders.forEach((p, i) => {
      if (!p || typeof p !== 'object') { add(`preorders.${i}`, 'Each pre-order must be an object.'); return; }
      if (typeof p.order_id !== 'string' || !p.order_id.trim()) add(`preorders.${i}.order_id`, 'The order id field is required.');
      if (!Number.isInteger(p.qty) || p.qty < 1) add(`preorders.${i}.qty`, 'The qty must be an integer of at least 1.');
    });
  }

  if (!Array.isArray(body.locations) || body.locations.length === 0) {
    add('locations', 'At least one location is required.');
  } else if (body.locations.length > 20) {
    add('locations', 'The locations may not have more than 20 items.');
  } else {
    let total = 0;
    body.locations.forEach((l, i) => {
      if (!l || typeof l !== 'object') { add(`locations.${i}`, 'Each location must be an object.'); return; }
      if (typeof l.name !== 'string' || !l.name.trim()) add(`locations.${i}.name`, 'The name field is required.');
      if (typeof l.share !== 'number' || !(l.share > 0) || l.share > 100) add(`locations.${i}.share`, 'The share must be a number between 0 and 100.');
      else total += l.share;
    });
    if (!errors.locations && Math.abs(total - 100) > 0.001 && !Object.keys(errors).some((k) => k.startsWith('locations.'))) {
      add('locations', `The location shares must add up to 100 (got ${total}).`);
    }
  }
  return errors;
}

function receive({ sku, inbound_qty, preorders = [], locations }) {
  let remaining = inbound_qty;

  const preorderResults = preorders.map((p) => {
    const filled = Math.min(p.qty, remaining);
    remaining -= filled;
    return {
      order_id: p.order_id,
      requested: p.qty,
      fulfilled: filled,
      outstanding: p.qty - filled,
      status: filled === p.qty ? 'fulfilled' : filled > 0 ? 'partially_fulfilled' : 'pending',
    };
  });

  const surplus = remaining;

  // Split surplus by share; hand any rounding remainder to the largest-share location.
  const allocation = locations.map((l) => ({ location: l.name, share: l.share, qty: Math.floor((surplus * l.share) / 100) }));
  const allocated = allocation.reduce((s, a) => s + a.qty, 0);
  if (surplus - allocated > 0) {
    const biggest = allocation.reduce((a, b) => (b.share > a.share ? b : a));
    biggest.qty += surplus - allocated;
  }

  return {
    sku: sku.trim(),
    received_qty: inbound_qty,
    preorders: {
      fulfilled_qty: inbound_qty - surplus,
      still_outstanding_qty: preorderResults.reduce((s, p) => s + p.outstanding, 0),
      orders: preorderResults,
    },
    surplus_released_to_available: surplus,
    allocation,
    processed_at: new Date().toISOString(),
  };
}

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ message: `The ${req.method} method is not supported for this route. Supported methods: POST.` });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ message: 'Malformed JSON in request body.' });
    }
  }

  const errors = validate(body);
  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'The given data was invalid.', errors });
  }

  return res.status(200).json({ data: receive(body) });
};
