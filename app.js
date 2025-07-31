require('dotenv').config(); //envv
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

//middlewares de autenticação
const { isAuthenticated, attachUserToResLocals } = require('./middlewares/authMiddleware');

// serviço Spotify para inicialização do token
const { getAccessToken } = require('./services/spotifyService');

// Rotas da Aplicação
const authRouter = require('./routes/auth');
const indexRouter = require('./routes/index');
const contactsRouter = require('./routes/contacts');
const explorerRouter = require('./routes/explorer');
const allReviewsRouter = require('./routes/allReviews');
const addRouter = require('./routes/add');        
const userRouter = require('./routes/user');        
const reviewRouter = require('./routes/reviews');  

const app = express();

// --- Conexão com o MongoDB ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexão com MongoDB estabelecida com sucesso!'))
  .catch(err => console.error('Erro de conexão com MongoDB:', err));


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions', //mongo
    ttl: 14 * 24 * 60 * 60 // Tempo de vida da sessão em segundos (14 dias)
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// --- Configuração do View Engine (EJS) ---
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));


app.use(attachUserToResLocals);

app.use('/auth', authRouter);
app.use('/', authRouter);
app.use('/', indexRouter);
app.use('/contacts', contactsRouter);
app.use('/explorer', explorerRouter);
app.use('/allReviews', allReviewsRouter);
app.use('/add', addRouter);          
app.use('/user', userRouter);        
app.use('/review', reviewRouter);  


app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
  // Inicia o processo de obtenção e renovação do token do Spotify
  getAccessToken().then(() => {
    console.log("Token inicial do Spotify obtido.");
  }).catch(err => {
    console.error("Falha ao obter token inicial do Spotify:", err);
  });
});

module.exports = app;


