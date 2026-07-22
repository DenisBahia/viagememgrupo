import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { joinGroup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MapPin, Loader2 } from 'lucide-react';

export const PENDING_SHARE_KEY = 'pendingShareKey';

/**
 * Route that handles shared invite links like /join/AB12CD34.
 * If the user is already logged in, joins the group immediately.
 * Otherwise, stores the key and redirects to login, so it can be
 * consumed right after authentication.
 */
export default function JoinPage() {
  const { shareKey } = useParams<{ shareKey: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const attempted = useRef(false);

  const joinMutation = useMutation({
    mutationFn: (key: string) => joinGroup(key),
    onSuccess: (group) => {
      sessionStorage.removeItem(PENDING_SHARE_KEY);
      toast.success(`Você entrou no grupo "${group.name}"!`);
      navigate(`/dashboard/${group.id}`, { replace: true });
    },
    onError: (err: any) => {
      sessionStorage.removeItem(PENDING_SHARE_KEY);
      toast.error(err.response?.data?.message || 'Chave de convite inválida.');
      navigate('/', { replace: true });
    }
  });

  useEffect(() => {
    if (!shareKey || attempted.current) return;
    attempted.current = true;

    if (isAuthenticated) {
      joinMutation.mutate(shareKey.toUpperCase());
    } else {
      sessionStorage.setItem(PENDING_SHARE_KEY, shareKey.toUpperCase());
      toast('Entre ou crie sua conta para acessar o grupo compartilhado.', { icon: '🔑' });
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareKey, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 text-center">
        <div className="bg-indigo-600 text-white p-3 rounded-full">
          <MapPin size={24} />
        </div>
        <Loader2 className="animate-spin text-indigo-500" size={22} />
        <p className="text-gray-600 text-sm">Entrando no grupo compartilhado...</p>
      </div>
    </div>
  );
}

