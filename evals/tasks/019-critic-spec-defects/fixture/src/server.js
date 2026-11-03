const express = require('express');
const { getOrder, updateStatus } = require('./orders');
const { refund } = require('./refunds');

const app = express();
app.use(express.json());

app.get('/orders/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.sendStatus(404);
  res.json(order);
});

app.post('/orders/:id/status', (req, res) => {
  res.json(updateStatus(req.params.id, req.body.status));
});

app.post('/orders/:id/refund', (req, res) => {
  refund(req.params.id, req.body.amountCents);
  res.json(getOrder(req.params.id));
});

app.listen(process.env.PORT || 3000);
