const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Alterado para 'bcrypt' - Correção aqui!

// --- Schema do Usuário ---
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 2,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: /^\S+@\S+$/
    },
    passwordHash: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: '/images/default-avatar.png'
    },
    bio: {
        type: String,
        maxlength: 250,
        default: 'Olá! Este é o meu perfil no MusicReview.'
    },
    favoriteTracks: [
        {
            spotifyId: { type: String, required: true },
            name: { type: String, required: true },
            artist: { type: String, required: true },
            cover: { type: String, default: '/images/default-music.png' },
            type: { type: String, enum: ['track', 'album'], required: true }
        }
    ],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// --- Middleware para hash da senha antes de salvar ---
userSchema.pre('save', async function(next) {
    if (this.isModified('passwordHash')) {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
    next();
});

// --- Método de instância para comparar senhas ---
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// --- Exporta o modelo ---
const User = mongoose.model('User', userSchema);

module.exports = User;
