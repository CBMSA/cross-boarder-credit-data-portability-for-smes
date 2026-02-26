const express = require('express');
const path = require('path');
const multer = require('multer');

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Set up middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Set up Multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save uploaded images in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to avoid name collisions
  }
});

const upload = multer({ storage: storage });

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Handle product uploads
app.post('/api/upload-product', upload.single('product-image'), (req, res) => {
  const { name, description, price } = req.body;

  if (!name || !description || !price || !req.file) {
    return res.status(400).send('All fields are required.');
  }

  const newProduct = {
    id: Date.now(),
    name,
    description,
    price,
    image: req.file.path, // Store the path of the uploaded image
  };

  // Simulate saving the product (you could save it to a database here)
  console.log('New Product Uploaded:', newProduct);

  res.status(201).json({
    message: 'Product uploaded successfully',
    product: newProduct,
  });
});

// Serve HTML file for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});