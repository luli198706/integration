const express = require('express');

// Mock ERP Server
const erpApp = express();
erpApp.use(express.json());

let erpProducts = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    category: 'electronics',
    sku: 'LP-001',
    manufacturer: 'TechCorp',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  },
  {
    id: '2', 
    name: 'Mouse',
    description: 'Wireless mouse',
    price: 29.99,
    category: 'electronics',
    sku: 'MS-001',
    manufacturer: 'TechCorp',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  }
];

erpApp.get('/products', (req, res) => {
  res.json(erpProducts);
});

erpApp.get('/products/:id', (req, res) => {
  const product = erpProducts.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

erpApp.post('/products', (req, res) => {
  const newProduct = {
    ...req.body,
    id: (erpProducts.length + 1).toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  };
  erpProducts.push(newProduct);
  res.status(201).json(newProduct);
});

erpApp.put('/products/:id', (req, res) => {
  const index = erpProducts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  
  erpProducts[index] = { ...erpProducts[index], ...req.body, updatedAt: new Date() };
  res.json(erpProducts[index]);
});

erpApp.delete('/products/:id', (req, res) => {
  const index = erpProducts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  
  erpProducts.splice(index, 1);
  res.status(204).send();
});

erpApp.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mock Warehouse Server
const warehouseApp = express();
warehouseApp.use(express.json());

let warehouseStock = {
  '1': { productId: '1', quantity: 15, location: 'A1', lastUpdated: new Date() },
  '2': { productId: '2', quantity: 0, location: 'B2', lastUpdated: new Date() }
};

warehouseApp.get('/stock/:id', (req, res) => {
  const stock = warehouseStock[req.params.id];
  if (!stock) return res.status(404).json({ error: 'Stock not found' });
  res.json(stock);
});

warehouseApp.get('/stock', (req, res) => {
  res.json(Object.values(warehouseStock));
});

warehouseApp.post('/stock/bulk', (req, res) => {
  const { productIds } = req.body;
  const stocks = productIds.map(id => warehouseStock[id] || null).filter(Boolean);
  res.json(stocks);
});

warehouseApp.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const ERP_PORT = 8081;
const WAREHOUSE_PORT = 8082;

erpApp.listen(ERP_PORT, () => {
  console.log(`Mock ERP Server running on port ${ERP_PORT}`);
});

warehouseApp.listen(WAREHOUSE_PORT, () => {
  console.log(`Mock Warehouse Server running on port ${WAREHOUSE_PORT}`);
});