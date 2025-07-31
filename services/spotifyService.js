// services/spotifyService.js
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Variáveis para gerenciar o token e sua expiração
let accessToken = null;
let expiresIn = 0;
let tokenRefreshTimeout = null;

// Função para obter um token de acesso de cliente
async function getAccessToken() {
  // Se já temos um token válido e ele não expirou ou está prestes a expirar (nos próximos 60 segundos), usa o existente
  if (accessToken && (Date.now() < expiresIn - 60 * 1000)) { // 60 segundos antes de expirar
    return accessToken;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    accessToken = data.body['access_token'];
    expiresIn = Date.now() + data.body['expires_in'] * 1000; // Tempo atual + segundos de expiração em milissegundos
    spotifyApi.setAccessToken(accessToken);
    console.log('Token de acesso do Spotify atualizado com sucesso!');

    // Limpa o timeout anterior, se houver, e define um novo para renovar o token
    if (tokenRefreshTimeout) {
      clearTimeout(tokenRefreshTimeout);
    }
    tokenRefreshTimeout = setTimeout(getAccessToken, (data.body['expires_in'] - 60) * 1000); // Renova 1 minuto antes de expirar

    return accessToken;
  } catch (err) {
    console.error('Erro ao buscar token de acesso do Spotify:', err);
    throw err; // Propaga o erro
  }
}

// Chame a função uma vez na inicialização para garantir que temos um token
getAccessToken().catch(error => {
    console.error("Falha na inicialização do token do Spotify:", error);
});


// Exporta o cliente Spotify e a função para obter o token (embora o token seja gerido internamente)
module.exports = { spotifyApi, getAccessToken };
