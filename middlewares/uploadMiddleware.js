// middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path'); // Módulo 'path' é nativo do Node.js

// Configurar o armazenamento do Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define o diretório onde os arquivos serão salvos.
    // O './public/uploads' é relativo à raiz do seu projeto (onde está o app.js)
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    // Define o nome do arquivo no disco
    // Aqui criamos um nome único usando a data e o nome original do arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

// Middleware de upload configurado
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB por arquivo (opcional)
});

module.exports = upload;
