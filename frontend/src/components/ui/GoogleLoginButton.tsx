import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginWithGoogle } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PENDING_SHARE_KEY } from '../../pages/JoinPage';

// Renders Google's official Sign-In button and exchanges the returned ID token
// for our own JWT via POST /api/auth/google. Used on both the login and register
// pages, since Google sign-in creates the account automatically on first use.
export default function GoogleLoginButton() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Não foi possível obter as credenciais do Google.');
      return;
    }
    try {
      const data = await loginWithGoogle(credentialResponse.credential);
      setAuth(data.token, data.user);
      const pendingKey = sessionStorage.getItem(PENDING_SHARE_KEY);
      navigate(pendingKey ? `/join/${pendingKey}` : '/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao entrar com o Google.');
    }
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          // The "flowName=GeneralOAuthFlow" text shown by Google's error page is generic
          // boilerplate present on every OAuth error (origin mismatch, invalid client, app
          // not verified, etc). Log the current origin here to make it easy to copy/paste
          // into Google Cloud Console > Credentials > OAuth Client > Authorized JavaScript origins.
          console.error(
            '[GoogleLogin] Falha ao autenticar. Confira em https://console.cloud.google.com/apis/credentials ' +
            'se "Authorized JavaScript origins" do OAuth Client contém exatamente:',
            window.location.origin
          );
          toast.error('Erro ao entrar com o Google. Veja o console para detalhes.');
        }}
        useOneTap={false}
        theme="outline"
        shape="pill"
        width="320"
      />
    </div>
  );
}



