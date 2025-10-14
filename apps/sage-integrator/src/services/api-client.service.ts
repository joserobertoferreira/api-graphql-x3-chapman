import { ApolloClient, ApolloLink, InMemoryCache, createHttpLink } from '@apollo/client/core';
import fetch from 'cross-fetch';
import { createHmac } from 'crypto'; // Módulo nativo do Node.js para criptografia

/**
 * Função responsável por gerar os headers de autenticação para cada requisição.
 * As chaves e segredos devem vir de variáveis de ambiente.
 */
const generateAuthHeaders = (): Record<string, string> => {
  // 1. Obter as credenciais das variáveis de ambiente (nunca colocar no código!)
  const APP_KEY = process.env.CHAPMAN_APP_KEY;
  const CLIENT_ID = process.env.CHAPMAN_CLIENT_ID;
  const CLIENT_SECRET = process.env.CHAPMAN_CLIENT_SECRET; // O segredo para gerar a assinatura

  if (!APP_KEY || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('As variáveis de ambiente de autenticação (APP_KEY, CLIENT_ID, CLIENT_SECRET) não estão definidas.');
  }

  // 2. Gerar o timestamp
  const timestamp = Date.now().toString();

  // 3. Criar a "mensagem" que será assinada (exemplo: appKey + clientId + timestamp)
  const message = `${APP_KEY}${CLIENT_ID}${timestamp}`;

  // 4. Gerar a assinatura usando HMAC-SHA256 (um exemplo comum e seguro)
  const signature = createHmac('sha256', CLIENT_SECRET)
    .update(message)
    .digest('hex');

  // 5. Retornar o objeto de headers
  return {
    'x-app-key': APP_KEY,
    'x-client-id': CLIENT_ID,
    'x-timestamp': timestamp,
    'x-signature': signature,
  };
};

// --- Configuração do Apollo Client ---

// 1. Link de Autenticação (o middleware)
// Este link intercepta cada requisição ANTES de ser enviada.
const authLink = new ApolloLink((operation, forward) => {
  // Adiciona os headers de autenticação ao contexto da requisição
  operation.setContext({
    headers: {
      ...operation.getContext().headers,
      ...generateAuthHeaders(),
    },
  });

  // Passa a requisição modificada para o próximo link na cadeia
  return forward(operation);
});

// 2. Link HTTP (o transportador)
// Este link é o responsável por efetivamente fazer a chamada HTTP para a sua API.
const httpLink = createHttpLink({
  uri: process.env.GRAPHQL_API_URL || 'http://localhost:3000/graphql', // URL da sua API
  fetch,
});

// 3. O Cliente Apollo
// Unimos os links: o authLink é executado primeiro, depois o httpLink.
// O resultado é um cliente pronto para ser usado, que se autentica automaticamente.
export const apiClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
