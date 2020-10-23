const express = require('express');

const app = express();

app.get('/', (req, res) => console.log('Server Running'))

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server connection established on port ${PORT}`));

