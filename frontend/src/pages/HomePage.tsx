import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroups, createGroup, updateGroup, joinGroup, deleteGroup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  MapPin, Plus, LogIn as JoinIcon, Trash2, LogOut, Calendar,
  Pencil, Share2, Link as LinkIcon, X, Plane
} from 'lucide-react';
import type { TravelGroup } from '../types';
import heroImg from '../assets/hero.png';
import MembersTooltip from '../components/groups/MembersTooltip';

type GroupFormState = { name: string; destination: string; startDate: string; endDate: string };
const emptyForm: GroupFormState = { name: '', destination: '', startDate: '', endDate: '' };

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TravelGroup | null>(null);
  const [shareGroup, setShareGroup] = useState<TravelGroup | null>(null);
  const [form, setForm] = useState<GroupFormState>(emptyForm);
  const [joinKey, setJoinKey] = useState('');

  const { data: groups = [], isLoading } = useQuery({ queryKey: ['groups'], queryFn: getGroups });

  const createMutation = useMutation({
    mutationFn: () => createGroup({
      name: form.name,
      destination: form.destination,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setShowCreate(false);
      setForm(emptyForm);
      toast.success('Grupo criado!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao criar grupo.')
  });

  const updateMutation = useMutation({
    mutationFn: () => updateGroup(editingGroup!.id, {
      name: form.name,
      destination: form.destination,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setEditingGroup(null);
      setForm(emptyForm);
      toast.success('Grupo atualizado!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao atualizar grupo.')
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

  const openEdit = (g: TravelGroup) => {
    setEditingGroup(g);
    setForm({
      name: g.name,
      destination: g.destination,
      startDate: g.startDate ? g.startDate.slice(0, 10) : '',
      endDate: g.endDate ? g.endDate.slice(0, 10) : '',
    });
  };

  const closeGroupForms = () => {
    setShowCreate(false);
    setEditingGroup(null);
    setForm(emptyForm);
  };

  const getShareLink = (shareKey: string) => `${window.location.origin}/join/${shareKey}`;

  const handleCopyLink = (shareKey: string) => {
    navigator.clipboard.writeText(getShareLink(shareKey));
    toast.success('Link de convite copiado!');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Chave copiada!');
  };

  const isFormOpen = showCreate || !!editingGroup;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <Plane size={18} />
          </div>
          <span className="font-bold text-gray-800 text-sm sm:text-base">Vai Junto ✈️</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline text-sm text-gray-600">Olá, <b>{user?.name}</b></span>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1.5" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-500">
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <img
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 hidden sm:block"
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
          <h1 className="text-white text-2xl sm:text-3xl font-bold">Planeje a próxima viagem, junto ✨</h1>
          <p className="text-indigo-100 mt-1.5 text-sm sm:text-base">
            Crie um grupo, junte a galera e monte o roteiro colaborativo no mapa.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Meus Grupos de Viagem</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(true); closeGroupForms(); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
            >
              <JoinIcon size={15} /> Entrar com Chave
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setEditingGroup(null); setForm(emptyForm); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus size={15} /> Novo Grupo
            </button>
          </div>
        </div>

        {/* Create / Edit form */}
        {isFormOpen && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              {editingGroup ? 'Editar Grupo' : 'Criar Novo Grupo'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do grupo</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Madrid 2025"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Destino</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Madrid, Espanha"
                  value={form.destination}
                  onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início (opcional)</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim (opcional)</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={closeGroupForms} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => editingGroup ? updateMutation.mutate() : createMutation.mutate()}
                disabled={!form.name || !form.destination || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingGroup
                  ? (updateMutation.isPending ? 'Salvando...' : 'Salvar alterações')
                  : (createMutation.isPending ? 'Criando...' : 'Criar')}
              </button>
            </div>
          </div>
        )}

        {/* Join form */}
        {showJoin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-6">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((g: TravelGroup) => (
              <div key={g.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/dashboard/${g.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg truncate">{g.name}</h3>
                    <p className="text-indigo-600 font-medium text-sm truncate">{g.destination}</p>
                    {(g.startDate || g.endDate) && (
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(g.startDate)} {g.endDate ? `→ ${formatDate(g.endDate)}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {g.isOwner && (
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(g); setShowCreate(false); }}
                        className="text-gray-300 hover:text-indigo-500 p-1.5 transition"
                        title="Editar grupo"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setShareGroup(g); }}
                      className="text-gray-300 hover:text-indigo-500 p-1.5 transition"
                      title="Compartilhar"
                    >
                      <Share2 size={15} />
                    </button>
                    {g.isOwner && (
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm('Excluir este grupo?')) deleteMutation.mutate(g.id); }}
                        className="text-gray-300 hover:text-red-500 p-1.5 transition"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <MembersTooltip memberCount={g.memberCount} members={g.members} />
                  <p className="text-xs text-gray-400">Chave: <span className="font-mono font-bold text-gray-600">{g.shareKey}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Share modal */}
      {shareGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShareGroup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Compartilhar "{shareGroup.name}"</h2>
              <button onClick={() => setShareGroup(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Envie o link abaixo para seus amigos/família. Ao abrir, eles poderão entrar
              automaticamente (ou criar conta) e já acessar o grupo.
            </p>
            <button
              onClick={() => handleCopyLink(shareGroup.shareKey)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <LinkIcon size={14} /> Copiar link de convite
            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mt-4">
              <p className="text-xs text-gray-500 mb-1">Ou use a chave de acesso</p>
              <p className="font-mono text-2xl font-bold text-indigo-600 tracking-widest">
                {shareGroup.shareKey}
              </p>
            </div>
            <button
              onClick={() => handleCopyKey(shareGroup.shareKey)}
              className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Copiar apenas a chave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

