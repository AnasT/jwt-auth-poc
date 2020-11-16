import React, { useContext } from 'react';
import { useFormik } from 'formik';
import { useMutation } from '@apollo/client';
import { setAccessToken } from '../../utils';
import { LOGIN } from '../../graphql/mutations';
import { ME } from '../../graphql/queries';
import { AppContext } from '../../constants';

const Login = () => {
  const { reloadUser } = useContext(AppContext);
  const {
    values,
    handleSubmit,
    handleChange,
    handleBlur,
    setFieldError,
    errors,
  } = useFormik({
    initialValues: {
      username: 'user_1',
      password: 'password_1',
    },
    onSubmit: async values => {
      await login({
        variables: values,
      });
    },
  });

  const [login] = useMutation(LOGIN, {
    onError: err => {
      setFieldError('username', err.message);
    },
    onCompleted: data => {
      setAccessToken(data.login);
      reloadUser();
    },
  });

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            value={values.username}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        {errors.username && (
          <div>
            <p>{errors.username}</p>
          </div>
        )}
        <div>
          <button type="submit">Confirm</button>
        </div>
      </form>
    </div>
  );
};

export default Login;
