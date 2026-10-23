const { conflict } = require('./errors');

// "Base de dados" em memória. Os ids são números inteiros sequenciais.
const state = { customers: [], products: [], orders: [], next: {} };

function reset() {
  state.customers = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
  state.products = [
    { id: 1, name: 'Widget', sku: 'W-1', price: 9.99 },
    { id: 2, name: 'Gadget', sku: 'G-1', price: 24.5 },
    // Importado do sistema antigo, sem preço definido.
    { id: 99, name: 'Legacy widget', sku: 'L-99', price: null },
  ];
  state.orders = [];
  state.next = { customers: 2, products: 100, orders: 1 };
}

reset();

function listCustomers() {
  return state.customers;
}

function getCustomer(id) {
  return state.customers.find((c) => c.id === id);
}

function findCustomerByEmail(email) {
  return state.customers.find((c) => c.email.toLowerCase() === email.toLowerCase());
}

function addCustomer({ name, email }) {
  const customer = { id: state.next.customers++, name, email };
  state.customers.push(customer);
  return customer;
}

function listProducts() {
  return state.products;
}

function getProduct(id) {
  return state.products.find((p) => p.id === id);
}

function addProduct({ name, sku, price }) {
  if (state.products.some((p) => p.sku === sku)) {
    throw conflict('SKU already exists: ' + sku);
  }
  const product = { id: state.next.products++, name, sku, price };
  state.products.push(product);
  return product;
}

// Preço arredondado a 2 casas decimais, como número.
function formatPrice(product) {
  return Number(product.price.toFixed(2));
}

function listOrders() {
  return state.orders;
}

function getOrder(id) {
  return state.orders.find((o) => o.id === id);
}

function addOrder(data) {
  const order = { id: state.next.orders++, ...data };
  state.orders.push(order);
  return order;
}

module.exports = {
  reset,
  listCustomers, getCustomer, findCustomerByEmail, addCustomer,
  listProducts, getProduct, addProduct, formatPrice,
  listOrders, getOrder, addOrder,
};
