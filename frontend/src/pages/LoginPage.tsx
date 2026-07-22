import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MapPin, LogIn } from 'lucide-react';
import { PENDING_SHARE_KEY } from './JoinPage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.token, data.user);
      const pendingKey = sessionStorage.getItem(PENDING_SHARE_KEY);
      navigate(pendingKey ? `/join/${pendingKey}` : '/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao entrar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=60"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-10"
      />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 text-white p-3 rounded-full mb-3">
            <MapPin size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Vai Junto ✈️</h1>
          <p className="text-gray-500 text-sm mt-1">Planeje viagens com quem você ama</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <LogIn size={16} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

