const { GraphQLServer } = require('graphql-yoga');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { AuthenticationError, ApolloError } = require('apollo-server-core');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { rule, shield, not } = require('graphql-shield');

const COOKIE_SECRET = 'secret';
const JWT_SECRET = 'secret';
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN = '2s';

const users = Array.from({ length: 2 }, (_, key) => {
  const id = `${key + 1}`;
  return {
    id,
    username: `user_${id}`,
    password: `password_${id}`,
  };
});

const refreshTokens = [];

const typeDefs = `
  type Query {
    me: User!
  }
  
  type User {
    id: ID!
    username: String!
  }

  type Mutation {
    login(username: String!, password: String!): String!
    refreshToken: String!
  }
`;

const resolvers = {
  Query: {
    me: (parent, args, context) => {
      return users.find(user => user.id === context.request.user.sub);
    },
  },
  Mutation: {
    login: (parent, { username, password }, context) => {
      const user = users.find(
        user => user.username === username && user.password === password
      );

      if (!user) {
        return new ApolloError('Login failed', 'LOGIN_FAILED');
      }

      const subject = user.id;
      const refreshToken = crypto.randomBytes(20).toString('hex');

      refreshTokens.push({
        subject,
        token: refreshToken,
      });

      context.response.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        signed: true,
      });

      return jwt.sign({}, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        subject,
        expiresIn: JWT_EXPIRES_IN,
      });
    },
    refreshToken: (parent, args, context) => {
      const oldRefreshToken = context.request.signedCookies.refreshToken;

      if (!oldRefreshToken) {
        return new ApolloError('Token refresh failed', 'TOKEN_REFRESH_ERROR');
      }

      const oldRefreshTokenIndex = refreshTokens.findIndex(
        refreshToken => refreshToken.token === oldRefreshToken
      );

      if (oldRefreshTokenIndex === -1) {
        return new ApolloError('Token refresh failed', 'TOKEN_REFRESH_ERROR');
      }

      const subject = refreshTokens[oldRefreshTokenIndex].subject;
      const newRefreshToken = crypto.randomBytes(20).toString('hex');

      refreshTokens.push({
        subject,
        token: newRefreshToken,
      });

      refreshTokens.splice(oldRefreshTokenIndex, 1);

      context.response.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        signed: true,
      });

      return jwt.sign({}, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        subject,
        expiresIn: JWT_EXPIRES_IN,
      });
    },
  },
};

const isAuthenticated = rule()((parent, args, context, info) => {
  if (Boolean(context.request.user)) {
    return true;
  }

  return new AuthenticationError('Unauthorized');
});

const permissions = shield({
  Query: {
    me: isAuthenticated,
  },
  Mutation: {
    login: not(
      isAuthenticated,
      new ApolloError('Already authenticated', 'ALREADY_AUTHENTICATED')
    ),
    refreshToken: not(
      isAuthenticated,
      new ApolloError('Already authenticated', 'ALREADY_AUTHENTICATED')
    ),
  },
});

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  middlewares: [permissions],
  context: req => ({ ...req }),
});

server.express.use(cookieParser(COOKIE_SECRET));

server.express.use(
  expressJwt({
    secret: JWT_SECRET,
    algorithms: [JWT_ALGORITHM],
    credentialsRequired: false,
  })
);

server.express.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    next();
  }
});

server.start(
  {
    port: 4000,
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
    },
  },
  () => {
    console.log(`Server start at http://localhost:4000`);
  }
);
