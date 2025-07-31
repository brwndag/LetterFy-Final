// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Importa o modelo User
const { isAuthenticated } = require('../middlewares/authMiddleware'); // Importa o middleware

// Middleware para disponibilizar currentUser para todas as views em rotas de autenticação
router.use((req, res, next) => {
 
  res.locals.currentUser = req.session.currentUser;
  next();
});

// --- Rota GET para o formulário de Registro ---
router.get('/register', (req, res) => {
  const errorMessage = req.query.error;
  res.render('register', { title: 'Registrar-se', error: errorMessage });
});

// --- Rota POST para processar o Registro ---
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.redirect('/auth/register?error=Todos os campos são obrigatórios.');
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.redirect('/auth/register?error=Nome de usuário já existe.');
      }
      if (existingUser.email === email) {
        return res.redirect('/auth/register?error=E-mail já registrado.');
      }
    }

    const newUser = new User({ username, email, passwordHash: password });
    await newUser.save();

    // *** LOGIN AUTOMÁTICO APÓS REGISTRO ***
    req.session.userId = newUser._id;
    req.session.currentUser = {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar 
    };
    // Redireciona para a página inicial (index), já logado
    res.redirect('/');

  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    let errorMessage = 'Erro ao registrar. Tente novamente.';
    if (err.code === 11000) {
      errorMessage = 'Nome de usuário ou e-mail já registrado.';
    } else if (err.name === 'ValidationError') {
      errorMessage = err.message;
    }
    res.redirect(`/auth/register?error=${encodeURIComponent(errorMessage)}`);
  }
});

// --- Rota GET para o formulário de Login ---
router.get('/login', (req, res) => {
  const errorMessage = req.query.error;
  const successMessage = req.query.success;
  // currentUser já está em res.locals
  res.render('login', { title: 'Login', error: errorMessage, success: successMessage });
});

// --- Rota POST para processar o Login ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect('/auth/login?error=Por favor, preencha e-mail e senha.');
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.redirect('/auth/login?error=Credenciais inválidas.');
    }

    // ***LOGIN BEM-SUCEDIDO ***
    req.session.userId = user._id;
    req.session.currentUser = {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
    };
    // Redireciona para a página inicial (index), já logado
    res.redirect('/');

  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.redirect('/auth/login?error=Ocorreu um erro ao tentar fazer login. Tente novamente.');
  }
});

// --- Rota de Logout ---
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid'); // Limpa o cookie da sessão
    res.redirect('/'); 
  });
});

module.exports = router;
