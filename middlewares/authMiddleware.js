// middlewares/authMiddleware.js
const User = require('../models/User'); // Garante que o caminho para o modelo User está correto

// Middleware para verificar se o usuário está autenticado
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    // Se o usuário estiver logado, continua para a próxima função de middleware/rota
    next();
  } else {
    // Se não estiver logado, redireciona para a página de login com uma mensagem de erro
    res.redirect('/login?error=Você precisa estar logado para acessar esta página.');
  }
}

// Middleware para anexar o objeto completo do usuário logado a res.locals.currentUser
// Isso permite que você acesse req.session.currentUser em qualquer template EJS
async function attachUserToResLocals(req, res, next) {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        res.locals.currentUser = user; // Define o objeto do usuário completo
      } else {
        // Se o usuário não for encontrado (ex: foi deletado), limpa a sessão
        req.session.destroy(err => {
          if (err) console.error('Erro ao destruir sessão de usuário inexistente:', err);
        });
        res.locals.currentUser = null;
      }
    } catch (err) {
      console.error('Erro ao buscar usuário para sessão (attachUserToResLocals):', err);
      res.locals.currentUser = null; // Em caso de erro, trate como não logado
    }
  } else {
    res.locals.currentUser = null; // Se não houver userId na sessão, não há currentUser
  }
  next(); // Continua para a próxima função de middleware/rota
}

module.exports = { isAuthenticated, attachUserToResLocals };
