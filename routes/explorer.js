// routes/explorer.js
const express = require('express');
const router = express.Router();
const { spotifyApi, getAccessToken } = require('../services/spotifyService'); // Importa o serviço Spotify

router.use(async (req, res, next) => {
  try {
    await getAccessToken();
    next();
  } catch (err) {
    console.error("Erro no middleware de token do Spotify:", err);

    res.status(500).render('error', {
      message: 'Erro ao conectar ao Spotify. Tente novamente mais tarde.',
      error: err,
      currentUser: res.locals.currentUser,
      error: null
    });
  }
});

// --- Rota para a página principal do Explorer ---
router.get('/', (req, res) => {
  res.render('explorer', {
    title: 'Explorar Spotify',
    currentUser: res.locals.currentUser,
    searchResults: null,
    query: '',
    type: '',
    error: null
  });
});

// --- Rota de Busca no Spotify ---
router.get('/search', async (req, res) => {
  const { query, type } = req.query;

  // Validação básica da query
  if (!query) {
    return res.render('explorer', {
      title: 'Explorar Spotify',
      currentUser: res.locals.currentUser,
      searchResults: null,
      error: 'Por favor, digite algo para buscar.',
      query: '', // Mantém o campo de busca vazio
      type: type || ''
    });
  }

  // Validação básica do tipo de busca
  if (type !== 'track' && type !== 'album' && type !== 'artist') {
    return res.render('explorer', {
      title: 'Explorar Spotify',
      currentUser: res.locals.currentUser,
      searchResults: null,
      error: 'Tipo de busca inválido. Use "track", "album" ou "artist".',
      query: query,
      type: type || ''
    });
  }

  try {
    let results;
    if (type === 'track') {
      results = await spotifyApi.searchTracks(query, { limit: 50 }); 
    } else if (type === 'album') {
      results = await spotifyApi.searchAlbums(query, { limit: 50 }); 
    } else if (type === 'artist') {
      results = await spotifyApi.searchArtists(query, { limit: 50 }); 
    }

    res.render('explorer', {
      title: `Resultados para "${query}"`,
      currentUser: res.locals.currentUser,
      searchResults: results.body,
      type: type,
      query: query,
      error: null
    });

  } catch (err) {
    console.error('Erro ao buscar no Spotify:', err);
    if (err.statusCode === 401) {
      try {
        await getAccessToken();
        return res.render('explorer', {
          title: 'Explorar Spotify',
          currentUser: res.locals.currentUser,
          searchResults: null,
          error: 'Token do Spotify expirado. Tente sua busca novamente.',
          query: query,
          type: type || ''
        });
      } catch (tokenErr) {
        console.error('Erro fatal ao renovar token do Spotify:', tokenErr);
        return res.status(500).render('error', {
          message: 'Não foi possível se conectar ao Spotify.',
          error: tokenErr,
          currentUser: res.locals.currentUser
        });
      }
    }
    res.status(500).render('error', {
      message: 'Erro interno ao buscar no Spotify.',
      error: err,
      currentUser: res.locals.currentUser,
      query: query,
      type: type || ''
    });
  }
});

router.get('/new-releases', async (req, res) => {
  try {
    const data = await spotifyApi.getNewReleases({ limit: 50, offset: 0, country: 'BR' }); // <<--- ALTERADO DE VOLTA PARA 50

    res.render('explorer', {
      title: 'Novos Lançamentos do Spotify',
      currentUser: res.locals.currentUser,
      searchResults: data.body,
      type: 'new-releases',
      query: 'Novos Lançamentos',
      error: null
    });

  } catch (err) {
    console.error('Erro ao buscar novos lançamentos:', err);
    res.status(500).render('error', {
      message: 'Erro ao carregar novos lançamentos do Spotify.',
      error: err,
      currentUser: res.locals.currentUser,
      query: '',
      type: ''
    });
  }
});

module.exports = router;
