import { createContext, useEffect, useReducer } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { API_ROOT } from 'utils/constants';
import { jwtDecode } from 'jwt-decode';
import { getUserInfo, setUserInfo } from 'utils/utils';
import { isValidToken, setSession } from 'utils/jwt';

const Types = {
  Login: 'LOGIN',
  Logout: 'LOGOUT'
};

const initialState = {
  isAuthenticated: false,
  isInitialized: false,
  user: null,
  role: null
};

const JWTReducer = (state, action) => {
  switch (action.type) {
    case 'INITIALIZE':
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        isInitialized: true,
        user: action.payload.user,
        role: action.payload.user.Role // Sử dụng Role từ decodedToken
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        role: null
      };
    default:
      return state;
  }
};

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(JWTReducer, initialState);

  useEffect(() => {
    const initialize = async () => {
      try {
        const token = window.localStorage.getItem('token');
        const userRaw = getUserInfo();
        if (token && isValidToken(token) && userRaw) {
          setSession(token);

          // TODO: IMPLEMENT METHOD TO GET USER INFO FROM TOKEN
          // const response = await axios.get('/api/account/my-account');
          // const { user } = response.data;

          const user = JSON.parse(userRaw);

          dispatch({
            type: Types.Initial,
            payload: {
              isAuthenticated: true,
              user
            }
          });
        } else {
          dispatch({
            type: Types.Initial,
            payload: {
              isAuthenticated: false,
              user: null
            }
          });
        }
      } catch (err) {
        console.error(err);
        dispatch({
          type: Types.Initial,
          payload: {
            isAuthenticated: false,
            user: null
          }
        });
      }
    };

    initialize();
  }, []);

  const login = async (name, password) => {
    try {
      const response = await axios.post(`${API_ROOT}/api/v1/login`, {
        name,
        password
      });
      const { token } = response.data;
      const decodedToken = jwtDecode(token);

      // if (!['admin', 'manager', 'driver'].includes(decodedToken.Role)) {
      //   setSession(null);
      //   setUserInfo({});
      //   navigate('/pages/login/login3', { replace: true });
      //   throw new Error('Bạn không có quyền đăng nhập vào hệ thống');
      // }
      const user = {
        id: decodedToken.Id,
        name: decodedToken.Name,
        role: decodedToken.Role,
        status: decodedToken.Status,
        iat: decodedToken.iat,
        exp: decodedToken.exp
      };
      console.log(user);
      setSession(token);
      setUserInfo(user);
      navigate('/', { replace: true });
      dispatch({
        type: Types.Login,
        payload: {
          user
        }
      });
    } catch (err) {
      console.error(err);
      throw new Error(err.response.data.message || 'Đăng nhập thất bại.');
    }
  };

  const logout = () => {
    setSession(null);
    dispatch({ type: Types.Logout });
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        method: 'jwt',
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
