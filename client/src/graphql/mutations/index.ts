import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password)
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken {
    refreshToken
  }
`;
