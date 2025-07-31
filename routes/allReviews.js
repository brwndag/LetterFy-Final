// routes/allReviews.js
const express = require('express');
const router = express.Router();
const Review = require('../models/Review'); // Importa o modelo Review
const createError = require('http-errors'); // Importa http-errors para lidar com erros

/* GET All Reviews page. */
router.get('/', async (req, res, next) => {
    try {
       
        const allReviews = await Review.find({})
                                     .populate('author', 'username avatar') // Popula o autor
                                     .sort({ createdAt: -1 }); // Ordena do mais recente para o mais antigo

        res.render('allReviews', {
            title: 'Todas as Reviews - LetterFy', // Título da página
            allReviews: allReviews 
        });

    } catch (error) {
        console.error('Erro ao carregar todas as reviews:', error);
        next(createError(500, 'Erro interno ao carregar as reviews.'));
    }
});

module.exports = router;
