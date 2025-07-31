// routes/user.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const List = require('../models/List');
const createError = require('http-errors');
const fetch = require('node-fetch'); // Certifique-se de que 'node-fetch' está instalado
const multer = require('multer');
const upload = require('../middlewares/uploadMiddleware');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// --- ROTAS FIXAS E ESPECÍFICAS (VEM PRIMEIRO) ---

// Rota para buscar no Spotify (via AJAX)
router.get('/spotify-search', isAuthenticated, async (req, res, next) => {
  try {
    const { query, type } = req.query;

    if (!query || !type) {
      return res.status(400).json({ error: 'Termo de busca e tipo são obrigatórios.' });
    }

    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';
    const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch(SPOTIFY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Erro ao obter token do Spotify:', tokenResponse.status, tokenResponse.statusText, errorText);
        let errorDetails = errorText;
        try {
            errorDetails = JSON.parse(errorText);
        } catch (e) { /* ignore */ }
        return res.status(tokenResponse.status).json({ error: 'Não foi possível autenticar com o Spotify.', details: errorDetails });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('Erro ao obter token do Spotify: Access token ausente na resposta', tokenData);
      return res.status(500).json({ error: 'Não foi possível autenticar com o Spotify (token ausente).' });
    }

    const searchResponse = await fetch(`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Erro ao buscar no Spotify:', searchResponse.status, searchResponse.statusText, errorText);
        let errorDetails = errorText;
        try {
            errorDetails = JSON.parse(errorText);
        } catch (e) { /* ignore */ }
        return res.status(searchResponse.status).json({ error: 'Erro ao buscar no Spotify.', details: errorDetails });
    }

    const searchData = await searchResponse.json();

    let results = [];
    if (type === 'track' && searchData.tracks) {
      results = searchData.tracks.items.map(track => ({
        spotifyId: track.id,
        type: 'track',
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        cover: track.album.images.length > 0 ? track.album.images[0].url : '/images/default-music.png'
      }));
    } else if (type === 'album' && searchData.albums) {
      results = searchData.albums.items.map(album => ({
        spotifyId: album.id,
        type: 'album',
        name: album.name,
        artist: album.artists.map(a => a.name).join(', '),
        cover: album.images.length > 0 ? album.images[0].url : '/images/default-music.png'
      }));
    } else if (type === 'artist' && searchData.artists) {
      results = searchData.artists.items.map(artist => ({
        spotifyId: artist.id,
        type: 'artist',
        name: artist.name,
        artist: artist.genres.length > 0 ? artist.genres[0] : 'Artista',
        cover: artist.images.length > 0 ? artist.images[0].url : '/images/default-music.png'
      }));
    }

    res.json(results);

  } catch (err) {
    console.error('Erro na requisição global do Spotify:', err);
    next(createError(500, 'Erro interno ao buscar no Spotify.'));
  }
});

// Rota para adicionar favorito
router.post('/add-favorite', isAuthenticated, async (req, res, next) => {
  try {
    const { spotifyId, type, name, artist, cover } = req.body;
    const currentUserId = req.session.userId;

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isAlreadyFavorite = user.favoriteTracks.some(fav => fav.spotifyId === spotifyId && fav.type === type);
    if (isAlreadyFavorite) {
      return res.status(409).json({ error: 'Este item já está nos seus favoritos.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
        currentUserId,
        { $push: { favoriteTracks: { spotifyId, type, name, artist, cover } } },
        { new: true, runValidators: true }
    );

    res.status(200).json({ message: 'Favorito adicionado com sucesso!', favorite: { spotifyId, type, name, artist, cover } });

  } catch (err) {
    console.error('Erro ao adicionar favorito:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    next(createError(500, 'Erro interno ao adicionar favorito.'));
  }
});


// --- ROTAS DINÂMICAS COM PARÂMETROS (VEM DEPOIS) ---

// Rota para exibir o formulário de edição de perfil (GET)
// Esta rota deve vir antes da rota de perfil para evitar conflitos
router.get('/:username/edit', isAuthenticated, async (req, res, next) => {
  try {
    const username = req.params.username;
    const userToEdit = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });

    if (!userToEdit || userToEdit._id.toString() !== req.session.userId) {
      return res.status(403).render('error', {
        title: 'Acesso Negado',
        message: 'Você não tem permissão para editar este perfil ou o perfil não existe.',
        error: { status: 403, stack: '' }
      });
    }

    res.render('edit_profile', {
      title: `Editar Perfil de ${userToEdit.username}`,
      user: userToEdit,
      error: req.query.error,
      success: req.query.success
    });

  } catch (err) {
    console.error('Erro ao carregar página de edição de perfil:', err);
    next(createError(500, 'Erro interno ao carregar a página de edição de perfil.'));
  }
});

// Rota para processar a atualização do perfil (POST)
router.post('/:username/edit', isAuthenticated, upload.single('avatarFile'), async (req, res, next) => {
  try {
    const usernameParam = req.params.username;
    const { username, email, bio, avatarUrl, imageType } = req.body;

    const userToUpdate = await User.findById(req.session.userId);

    if (!userToUpdate || userToUpdate.username.toLowerCase() !== usernameParam.toLowerCase()) {
      return res.status(403).redirect(`/user/${usernameParam}/edit?error=Acesso negado ou perfil incorreto.`);
    }

    if (!username || username.trim() === '' || !email || email.trim() === '') {
      return res.redirect(`/user/${usernameParam}/edit?error=Nome de usuário e email são obrigatórios.`);
    }

    const existingUser = await User.findOne({
        $or: [
            { username: new RegExp(`^${username}$`, 'i') },
            { email: new RegExp(`^${email}$`, 'i') }
        ]
    });

    if (existingUser && existingUser._id.toString() !== userToUpdate._id.toString()) {
      return res.redirect(`/user/${usernameParam}/edit?error=Nome de usuário ou email já em uso.`);
    }

    userToUpdate.username = username.trim();
    userToUpdate.email = email.trim();
    userToUpdate.bio = bio;

    if (imageType === 'upload' && req.file) {
      const relativePath = '/uploads/' + req.file.filename;
      userToUpdate.avatar = relativePath;
    } else if (imageType === 'url' && avatarUrl && avatarUrl.trim() !== '') {
      userToUpdate.avatar = avatarUrl.trim();
    } else if (imageType === 'none') {
      userToUpdate.avatar = '/images/default-avatar.png';
    }

    await userToUpdate.save();

    if (req.session.username !== userToUpdate.username) {
      req.session.username = userToUpdate.username;
    }

    res.redirect(`/user/${userToUpdate.username}?success=Perfil atualizado com sucesso!`);

  } catch (err) {
    console.error('ERRO DETALHADO AO ATUALIZAR PERFIL:', err);

    if (err instanceof multer.MulterError) {
      return res.redirect(`/user/${req.params.username}/edit?error=Erro no upload da imagem: ${err.message}`);
    }
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      const msg = `Erro de validação: ${errors.join('; ')}.`;
      return res.redirect(`/user/${req.params.username}/edit?error=${msg}`);
    }
    if (err.code === 11000) {
      let msg = 'Erro: ';
      if (err.keyPattern && err.keyPattern.username) msg += 'Nome de usuário já existe.';
      else if (err.keyPattern && err.keyPattern.email) msg += 'Email já registrado.';
      else msg += 'Valor duplicado.';
      return res.redirect(`/user/${req.params.username}/edit?error=${msg}`);
    }

    next(createError(500, 'Erro interno ao atualizar perfil.'));
  }
});

// Rota para seguir/deixar de seguir um usuário
router.post('/:username/follow', isAuthenticated, async (req, res, next) => {
  try {
    const usernameToFollow = req.params.username;
    const currentUserId = req.session.userId;

    const targetUser = await User.findOne({ username: new RegExp(`^${usernameToFollow}$`, 'i') });

    if (!targetUser) {
      console.log(`LOG: Tentativa de seguir/deixar de seguir usuário não encontrado: ${usernameToFollow}`);
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (targetUser._id.toString() === currentUserId.toString()) {
      console.log(`LOG: Usuário ${req.session.username} tentou seguir a si mesmo.`);
      return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
    }

    const isFollowing = targetUser.followers.includes(currentUserId);
    let message = '';
    let status = '';

    if (isFollowing) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUser._id } });
      await User.findByIdAndUpdate(targetUser._id, { $pull: { followers: currentUserId } });
      message = `Você deixou de seguir ${targetUser.username}.`;
      status = 'unfollowed';
      console.log(`LOG: ${req.session.username} deixou de seguir ${targetUser.username}`);
    } else {
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUser._id } });
      await User.findByIdAndUpdate(targetUser._id, { $addToSet: { followers: currentUserId } });
      message = `Você agora está seguindo ${targetUser.username}.`;
      status = 'followed';
      console.log(`LOG: ${req.session.username} agora segue ${targetUser.username}`);
    }

    res.status(200).json({ status: status, message: message, isFollowing: !isFollowing });

  } catch (err) {
    console.error('Erro ao seguir/deixar de seguir:', err);
    res.status(500).json({ message: 'Erro interno do servidor ao processar a solicitação.' });
  }
});

// Rota para o perfil do usuário (VEM DEPOIS DAS ROTAS DE EDIÇÃO)
router.get('/:username', async (req, res, next) => {
  try {
    const username = req.params.username;
    const profileUser = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });

    if (!profileUser) {
      return res.status(404).render('error', {
        title: 'Usuário Não Encontrado',
        message: 'O usuário que você está procurando não existe.',
        error: { status: 404, stack: '' }
      });
    }

    const totalReviews = await Review.countDocuments({ author: profileUser._id });
    const reviewsByType = await Review.aggregate([
      { $match: { author: profileUser._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const reviewCounts = {};
    reviewsByType.forEach(item => {
      reviewCounts[item._id] = item.count;
    });

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const reviewsThisYear = await Review.countDocuments({
      author: profileUser._id,
      createdAt: { $gte: startOfYear, $lte: endOfYear }
    });

    const userReviews = await Review.find({ author: profileUser._id })
                                     .populate('author', 'username avatar')
                                     .sort({ createdAt: -1 })
                                     .limit(5);

    const userCollections = await List.find({ author: profileUser._id })
                                      .sort({ createdAt: -1 });

    let isFollowing = false;
    if (req.session.userId && profileUser.followers.includes(req.session.userId)) {
        isFollowing = true;
    }

    res.render('profile', {
      title: `Perfil de ${profileUser.username}`,
      profileUser: profileUser,
      totalReviews: totalReviews,
      reviewCounts: reviewCounts,
      reviewsThisYear: reviewsThisYear,
      userReviews: userReviews,
      userCollections: userCollections,
      isFollowing: isFollowing,
      success: req.query.success
    });

  } catch (err) {
    console.error('Erro ao carregar perfil:', err);
    next(createError(500, 'Erro interno ao carregar o perfil.'));
  }
});


// Rota genérica para listar usuários (VEM POR ÚLTIMO)
router.get('/', function(req, res, next) {
  res.send('respond with a resource (users list)');
});


module.exports = router;
