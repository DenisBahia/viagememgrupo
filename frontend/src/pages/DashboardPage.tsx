import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLocations, exportRoute, getGroups } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TravelMap from '../components/map/TravelMap';
import LocationForm from '../components/locations/LocationForm';
import LocationCard from '../components/locations/LocationCard';
import type { Location, Priority, LocationType } from '../types';
import { PRIORITY_CONFIG, TYPE_CONFIG } from '../components/ui/constants';
import toast from 'react-hot-toast';
import {
  MapPin, Plus, ArrowLeft, Share2, Copy, Route,
  LogOut, Filter
} from 'lucide-react';

export default function DashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [filterDay, setFilterDay] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterType, setFilterType] = useState<LocationType | ''>('');

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', groupId],
    queryFn: () => getLocations(groupId!),
    refetchInterval: 15000,
  });

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: getGroups });
  const groupInfo = groups.find((g: any) => g.id === groupId);

  const allDays = [...new Set(locations.map((l: Location) => l.dayLabel).filter(Boolean))] as string[];

  const filtered = locations.filter((l: Location) => {
    if (filterDay && l.dayLabel !== filterDay) return false;
    if (filterPriority && l.priority !== filterPriority) return false;
    if (filterType && l.type !== filterType) return false;
    return true;
  });

  const handleExport = async () => {
    try {
      const { url } = await exportRoute(groupId!, filterDay || undefined);
      window.open(url, '_blank');
    } catch {
      toast.error('Adicione pelo menos 2 locais para exportar a rota.');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Chave copiada!');
  };

  const mapCenter = filtered.length > 0
    ? { lat: filtered[0].lat, lng: filtered[0].lng }
    : undefined;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-10 flex-shrink-0">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="bg-indigo-600 text-white p-1 rounded">
            <MapPin size={14} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-sm leading-tight truncate">
              {groupInfo?.name ?? 'Planejamento'}
            </h1>
            {groupInfo?.destination && (
              <p className="text-xs text-indigo-600">{groupInfo.destination}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            <Share2 size={13} /> Compartilhar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Route size={13} /> Exportar Rota
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={13} /> Adicionar
          </button>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
              <Filter size={12} /> Filtros
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <select
                className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={filterDay}
                onChange={e => setFilterDay(e.target.value)}
              >
                <option value="">Todos os dias</option>
                {allDays.map(d => <option key={d} value={d!}>{d}</option>)}
              </select>
              <select
                className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value as Priority | '')}
              >
                <option value="">Toda prioridade</option>
                {(Object.entries(PRIORITY_CONFIG) as [Priority, any][]).map(([k, v]) =>
                  <option key={k} value={k}>{v.label}</option>
                )}
              </select>
              <select
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={filterType}
                onChange={e => setFilterType(e.target.value as LocationType | '')}
              >
                <option value="">Tipo</option>
                {(Object.entries(TYPE_CONFIG) as [LocationType, any][]).map(([k, v]) =>
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                )}
              </select>
            </div>
            <p className="text-xs text-gray-400">{filtered.length} local(is) encontrado(s)</p>
          </div>

          {/* Location list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <MapPin size={36} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhum local ainda</p>
                <p className="text-gray-300 text-xs mt-1">Clique em "+ Adicionar" para começar</p>
              </div>
            ) : (
              filtered.map(loc => (
                <LocationCard key={loc.id} location={loc} groupId={groupId!} />
              ))
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <TravelMap locations={filtered} center={mapCenter} />
        </main>
      </div>

      {/* Add location modal */}
      {showForm && <LocationForm groupId={groupId!} onClose={() => setShowForm(false)} />}

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4">Compartilhar Grupo</h2>
            <p className="text-sm text-gray-600 mb-3">
              Compartilhe a chave abaixo com seus amigos/família. Eles poderão entrar no site
              e visualizar/editar o planejamento junto com você.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Chave de acesso</p>
              <p className="font-mono text-3xl font-bold text-indigo-600 tracking-widest">
                {groupInfo?.shareKey ?? '...'}
              </p>
            </div>
            <button
              onClick={() => handleCopyKey(groupInfo?.shareKey ?? '')}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <Copy size={14} /> Copiar Chave
            </button>
            <button
              onClick={() => setShowShare(false)}
              className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}






