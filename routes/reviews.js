// routes/reviews.js
const express = require('express');
const router = express.Router();
const Review = require('../models/Review'); // Importa seu modelo de Review
const { isAuthenticated } = require('../middlewares/authMiddleware'); // Importa o middleware de autenticação
const { spotifyApi, getAccessToken } = require('../services/spotifyService'); // Para buscar detalhes do item

// Middleware para garantir que temos um token de acesso do Spotify antes de cada busca
router.use(async (req, res, next) => {
  try {
    await getAccessToken(); // Garante que o token esteja atualizado e seta no spotifyApi
    next();
  } catch (err) {
    console.error("Erro no middleware de token do Spotify em reviews:", err);
    res.status(500).render('error', {
      message: 'Erro ao conectar ao Spotify para reviews. Tente novamente mais tarde.',
      error: err,
      currentUser: res.locals.currentUser
    });
  }
});


// --- Rota para Exibir Detalhes de um Item do Spotify e suas Reviews (GET) ---
router.get('/:type/:spotifyId', async (req, res) => {
  const { type, spotifyId } = req.params;
  const reviewSuccess = req.query.reviewSuccess === 'true'; // Verifica se veio do redirecionamento de sucesso

  // Validação básica
  if (!spotifyId || (type !== 'track' && type !== 'album' && type !== 'artist')) {
    return res.status(400).render('error', {
      message: 'Tipo ou ID do item do Spotify inválido.',
      currentUser: res.locals.currentUser,
      error: null
    });
  }

  try {
    let spotifyItem;
    if (type === 'track') {
      const trackData = await spotifyApi.getTrack(spotifyId);
      spotifyItem = trackData.body;
    } else if (type === 'album') {
      const albumData = await spotifyApi.getAlbum(spotifyId);
      spotifyItem = albumData.body;
    } else if (type === 'artist') {
        const artistData = await spotifyApi.getArtist(spotifyId);
        spotifyItem = artistData.body;
    }

    if (!spotifyItem) {
      return res.status(404).render('error', {
        message: 'Item do Spotify não encontrado.',
        currentUser: res.locals.currentUser,
        error: null
      });
    }

    // Busca todas as reviews para este spotifyId e popula o autor para pegar o username
    const reviews = await Review.find({ spotifyId: spotifyId }).populate('author', 'username profilePicture').sort({ createdAt: -1 });

    res.render('review', { // <--- ALTERADO PARA 'review'
      title: `Detalhes e Reviews de ${spotifyItem.name}`,
      currentUser: res.locals.currentUser,
      spotifyItem: spotifyItem,
      reviews: reviews,
      error: null, // Garante que 'error' esteja definido
      reviewSuccess: reviewSuccess // Passa a flag de sucesso para a view
    });

  } catch (err) {
    console.error('Erro ao buscar detalhes do item ou reviews:', err);
    if (err.statusCode === 401) { // Token expirado ou inválido
        try {
            await getAccessToken(); // Tenta obter um novo token
            return res.render('review', { // <--- ALTERADO PARA 'review'
                title: 'Erro de conexão com Spotify',
                currentUser: res.locals.currentUser,
                spotifyItem: null, // Não temos o item para exibir
                reviews: [],
                error: 'Token do Spotify expirado. Por favor, tente recarregar a página.',
                reviewSuccess: false
            });
        } catch (tokenErr) {
            console.error('Erro fatal ao renovar token do Spotify para detalhes do item:', tokenErr);
            return res.status(500).render('error', {
                message: 'Não foi possível se conectar ao Spotify para carregar os detalhes.',
                error: tokenErr,
                currentUser: res.locals.currentUser
            });
        }
    }
    res.status(500).render('error', {
      message: 'Erro interno ao carregar detalhes do item ou reviews.',
      error: err,
      currentUser: res.locals.currentUser
    });
  }
});


// --- Rota para SUBMETER uma Nova Review (POST) ---
router.post('/:type/:spotifyId', isAuthenticated, async (req, res) => { // Mudei a rota POST para incluir type e spotifyId
  const { type, spotifyId } = req.params; // Pega type e spotifyId da URL
  const { rating, comment } = req.body;
  const author = req.session.userId; // O ID do usuário logado

  if (!spotifyId || !type || !rating || !comment || !author) {
    // Redireciona de volta para a página de detalhes com um erro
    return res.redirect(`/review/${type}/${spotifyId}?error=missing_fields`);
  }
  if (rating < 1 || rating > 5) {
    // Redireciona de volta para a página de detalhes com um erro
    return res.redirect(`/review/${type}/${spotifyId}?error=invalid_rating`);
  }

  try {
    // Opcional: Buscar detalhes do item no Spotify para armazenar no review (cache)
    let spotifyItemDetails = {};
    if (type === 'track') {
      const trackData = await spotifyApi.getTrack(spotifyId);
      spotifyItemDetails = {
        name: trackData.body.name,
        artist: trackData.body.artists.map(a => a.name).join(', '),
        cover: trackData.body.album.images.length > 0 ? trackData.body.album.images[0].url : null,
      };
    } else if (type === 'album') {
      const albumData = await spotifyApi.getAlbum(spotifyId);
      spotifyItemDetails = {
        name: albumData.body.name,
        artist: albumData.body.artists.map(a => a.name).join(', '),
        cover: albumData.body.images.length > 0 ? albumData.body.images[0].url : null,
      };
    } else if (type === 'artist') {
        const artistData = await spotifyApi.getArtist(spotifyId);
        spotifyItemDetails = {
            name: artistData.body.name,
            artist: null, // Artistas não têm "artist" dentro de si
            cover: artistData.body.images.length > 0 ? artistData.body.images[0].url : null,
        };
    }

    const newReview = new Review({
      spotifyId,
      type,
      spotifyItem: spotifyItemDetails,
      rating,
      comment,
      author,
    });

    await newReview.save();

    // Redirecionar para a página do item com uma mensagem de sucesso
    res.redirect(`/review/${type}/${spotifyId}?reviewSuccess=true`);

  } catch (err) {
    console.error('Erro ao submeter review:', err);
    // Redireciona de volta para a página de detalhes com um erro
    res.redirect(`/review/${type}/${spotifyId}?error=submit_failed`);
  }
});


module.exports = router;
