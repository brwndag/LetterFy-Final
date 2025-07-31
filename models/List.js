// models/List.js
const mongoose = require('mongoose');

const listItemSchema = new mongoose.Schema({
    spotifyId: { type: String, required: true },
    type: { type: String, enum: ['album', 'track'], required: true }, // Tipo do item (música ou álbum)
    // Cached Spotify item details (para evitar chamar a API do Spotify toda hora)
    spotifyItem: {
        name: { type: String, required: true },
        artist: { type: String, required: true },
        cover: { type: String },
    }
}, { _id: false }); // Não gera _id para subdocumentos, a menos que você precise de referências diretas a eles.

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [listItemSchema], // Array de itens (músicas/álbuns do Spotify)
  isPublic: { // Se a lista é pública ou privada
    type: Boolean,
    default: false
  },
  // Você pode adicionar um campo 'type' para a lista se quiser categorizá-la (Ex: 'playlist', 'album collection')
  // type: { type: String, enum: ['playlist', 'collection'], default: 'playlist' }
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// --- CRÍTICO: Garante que o modelo 'List' só seja compilado uma vez ---
module.exports = mongoose.models.List || mongoose.model('List', listSchema);
