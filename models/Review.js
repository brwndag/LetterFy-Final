// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  spotifyId: { type: String, required: true }, // ID da música/álbum no Spotify
  type: { type: String, enum: ['album', 'track'], required: true }, // Se é 'album' ou 'track'
  // Um objeto aninhado para guardar os detalhes do item do Spotify
  spotifyItem: {
    name: { type: String, required: true }, // Título da música/álbum
    artist: { type: String, required: true }, // Artista da música/álbum
    cover: { type: String }, // URL da capa
  },
  rating: { type: Number, min: 1, max: 5, required: true }, // Classificação em estrelas (1 a 5)
  comment: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ID do usuário que fez a review
  isFavorite: { type: Boolean, default: false } // Campo para indicar se a review foi marcada como favorita
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// --- CRÍTICO: Garante que o modelo 'Review' só seja compilado uma vez ---
module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);
