// routes/index.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Para buscar usuários
const Review = require('../models/Review'); // Para buscar reviews

/* GET home page (ou a página principal de busca/exploração). */
router.get('/', async function(req, res, next) {
  try {
    const searchQuery = req.query.q || ''; // Termo de busca, pode ser vazio se não houver query param

    let foundUsers = [];
    // Se houver um termo de busca, procure usuários
    if (searchQuery) {
      // Usamos RegExp com 'i' para busca case-insensitive
      foundUsers = await User.find({ username: new RegExp(searchQuery, 'i') })
                             .limit(10); // Limite de resultados para evitar sobrecarga
    }

    // Buscar as últimas reviews, independentemente da busca por usuário
    const latestReviews = await Review.find({})
      .populate('author', 'username avatar') // Popula os dados do autor (username e avatar)
      // Não precisa de .populate('item') porque spotifyItem é um subdocumento
      .sort({ createdAt: -1 }) // Mais recente primeiro
      .limit(5); // Limite para "últimas reviews"

    res.render('index', {
      title: 'Bem-vindo ao LetterFy!', // Título da sua página
      searchQuery: searchQuery, // Passa o termo de busca para pré-popular o input
      foundUsers: foundUsers, // Passa os usuários encontrados (será vazio se não houver busca)
      latestReviews: latestReviews // Passa as últimas reviews
    });

  } catch (error) {
    console.error('Erro ao carregar página inicial ou processar busca:', error);
    next(error); // Passa o erro para o middleware de erro do Express
  }
});

// Nota: Se você tivesse uma rota /search separada, o código seria similar
// router.get('/search', async (req, res, next) => { ... });
// Mas, como o erro veio do index.ejs, estou assumindo que a rota '/'
// é quem está rendenizando o formulário de busca e as reviews.

module.exports = router;
