import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, createGroup, joinGroup, deleteGroup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { MapPin, Plus, LogIn as JoinIcon, Trash2, LogOut, Users, Calendar } from 'lucide-react';
import type { TravelGroup } from '../types';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', destination: '', startDate: '', endDate: '' });
  const [joinKey, setJoinKey] = useState('');

  const { data: groups = [], isLoading } = useQuery({ queryKey: ['groups'], queryFn: getGroups });

  const createMutation = useMutation({
    mutationFn: () => createGroup({
      name: createForm.name,
      destination: createForm.destination,
      startDate: createForm.startDate || undefined,
      endDate: createForm.endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setShowCreate(false);
      setCreateForm({ name: '', destination: '', startDate: '', endDate: '' });
      toast.success('Grupo criado!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao criar grupo.')
  });

  const joinMutation = useMutation({
    mutationFn: () => joinGroup(joinKey.trim()),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setShowJoin(false);
      setJoinKey('');
      toast.success(`Entrou no grupo "${group.name}"!`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Chave inválida.')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Grupo excluído.');
    },
    onError: () => toast.error('Apenas o dono pode excluir o grupo.')
  });

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <MapPin size={18} />
          </div>
          <span className="font-bold text-gray-800">ViagemEmGrupo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Olá, <b>{user?.name}</b></span>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1.5" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Meus Grupos de Viagem</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
              className="flex items-center gap-1.5 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
            >
              <JoinIcon size={15} /> Entrar com Chave
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus size={15} /> Novo Grupo
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Criar Novo Grupo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do grupo</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Madrid 2025"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Destino</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Madrid, Espanha"
                  value={createForm.destination}
                  onChange={e => setCreateForm(f => ({ ...f, destination: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início (opcional)</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={createForm.startDate} onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim (opcional)</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={createForm.endDate} onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!createForm.name || !createForm.destination || createMutation.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        )}

        {/* Join form */}
        {showJoin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Entrar em um Grupo</h3>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chave de acesso</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 uppercase tracking-widest"
              placeholder="Ex: AB12CD34"
              value={joinKey}
              onChange={e => setJoinKey(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => joinMutation.mutate()}
                disabled={joinKey.length < 6 || joinMutation.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {joinMutation.isPending ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        )}

        {/* Groups list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <MapPin size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum grupo ainda</p>
            <p className="text-gray-400 text-sm mt-1">Crie um grupo ou entre com uma chave de convite</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((g: TravelGroup) => (
              <div key={g.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/dashboard/${g.id}`)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{g.name}</h3>
                    <p className="text-indigo-600 font-medium text-sm">{g.destination}</p>
                    {(g.startDate || g.endDate) && (
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(g.startDate)} {g.endDate ? `→ ${formatDate(g.endDate)}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Users size={11} /> {g.memberCount} {g.memberCount === 1 ? 'membro' : 'membros'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Chave: <span className="font-mono font-bold text-gray-600">{g.shareKey}</span></p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (confirm('Excluir este grupo?')) deleteMutation.mutate(g.id); }}
                      className="text-gray-300 hover:text-red-500 p-1 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

