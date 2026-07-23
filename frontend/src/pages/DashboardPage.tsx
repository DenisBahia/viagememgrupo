import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocations, getGroups, updateGroup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TravelMap from '../components/map/TravelMap';
import LocationForm from '../components/locations/LocationForm';
import LocationsByDay from '../components/locations/LocationsByDay';
import ItineraryModal from '../components/locations/ItineraryModal';
import ExportRoutesModal from '../components/locations/ExportRoutesModal';
import type { Location, Priority, LocationType } from '../types';
import { PRIORITY_CONFIG, TYPE_CONFIG } from '../components/ui/constants';
import toast from 'react-hot-toast';
import {
  MapPin, Plus, ArrowLeft, Share2, Copy, Route,
  LogOut, Filter, Pencil, X, Link as LinkIcon, List, Map as MapIcon,
  Sparkles, Waypoints
} from 'lucide-react';

export default function DashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [showExportRoutes, setShowExportRoutes] = useState(false);
  const [showRoutesOnMap, setShowRoutesOnMap] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', destination: '', startDate: '', endDate: '' });
  const [filterDay, setFilterDay] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterType, setFilterType] = useState<LocationType | ''>('');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('map');
  const [showMobileFilters, setShowMobileFilters] = useState(false);



  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', groupId],
    queryFn: () => getLocations(groupId!),
    refetchInterval: 15000,
  });

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: getGroups });
  const groupInfo = groups.find((g: any) => g.id === groupId);

  const updateGroupMutation = useMutation({
    mutationFn: () => updateGroup(groupId!, {
      name: editForm.name,
      destination: editForm.destination,
      startDate: editForm.startDate || undefined,
      endDate: editForm.endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setShowEdit(false);
      toast.success('Grupo atualizado!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao atualizar grupo.')
  });

  const openEdit = () => {
    if (!groupInfo) return;
    setEditForm({
      name: groupInfo.name,
      destination: groupInfo.destination,
      startDate: groupInfo.startDate ? groupInfo.startDate.slice(0, 10) : '',
      endDate: groupInfo.endDate ? groupInfo.endDate.slice(0, 10) : '',
    });
    setShowEdit(true);
  };

  const allDays = ([...new Set(locations.map((l: Location) => l.dayLabel).filter(Boolean))] as string[])
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));

  const filtered = locations.filter((l: Location) => {
    if (filterDay && l.dayLabel !== filterDay) return false;
    if (filterPriority && l.priority !== filterPriority) return false;
    if (filterType && l.type !== filterType) return false;
    return true;
  });

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Nenhum local encontrado com os filtros atuais.');
      return;
    }
    setShowExportRoutes(true);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Chave copiada!');
  };

  const getShareLink = (shareKey: string) => `${window.location.origin}/join/${shareKey}`;

  const handleCopyLink = (shareKey: string) => {
    navigator.clipboard.writeText(getShareLink(shareKey));
    toast.success('Link de convite copiado!');
  };

  const mapCenter = filtered.length > 0
    ? { lat: filtered[0].lat, lng: filtered[0].lng }
    : (groupInfo?.destinationLat != null && groupInfo?.destinationLng != null
      ? { lat: groupInfo.destinationLat, lng: groupInfo.destinationLng }
      : undefined);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 z-10 flex-shrink-0">
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
              <p className="text-xs text-indigo-600 truncate">{groupInfo.destination}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {groupInfo?.isOwner && (
            <button
              onClick={openEdit}
              className="hidden sm:flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              title="Editar grupo"
            >
              <Pencil size={13} /> Editar
            </button>
          )}
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            title="Compartilhar"
          >
            <Share2 size={13} /> <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button
            onClick={() => setShowItinerary(true)}
            className="flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            title="Sugerir roteiros por dia"
          >
            <Sparkles size={13} /> <span className="hidden sm:inline">Sugerir Roteiros</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
            title="Exportar rotas"
          >
            <Route size={13} /> <span className="hidden sm:inline">Exportar Rotas</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs px-2.5 sm:px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            title="Adicionar local"
          >
            <Plus size={13} /> <span className="hidden sm:inline">Adicionar</span>
          </button>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </header>


      {/* Mobile view toggle */}
      <div className="sm:hidden flex border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium ${mobileView === 'map' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
          <MapIcon size={14} /> Mapa
        </button>
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium ${mobileView === 'list' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
          <List size={14} /> Lista ({filtered.length})
        </button>
        <button
          onClick={() => setShowMobileFilters(f => !f)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-500 border-l border-gray-200"
        >
          <Filter size={14} />
        </button>
      </div>

      {/* Mobile filters panel */}
      {showMobileFilters && (
        <div className="sm:hidden p-3 border-b border-gray-100 bg-white space-y-2 flex-shrink-0">
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
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 accent-indigo-600"
              checked={showRoutesOnMap}
              onChange={e => setShowRoutesOnMap(e.target.checked)}
            />
            <Waypoints size={12} /> Mostrar rotas por dia no mapa
          </label>
          {groupInfo?.isOwner && (
            <button
              onClick={openEdit}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <Pencil size={12} /> Editar grupo
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-full sm:w-80 flex-shrink-0 bg-white sm:border-r border-gray-200 flex flex-col overflow-hidden ${mobileView === 'list' ? 'flex' : 'hidden sm:flex'}`}>
          {/* Filters (desktop) */}
          <div className="hidden sm:block p-3 border-b border-gray-100 space-y-2">
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
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 accent-indigo-600"
                checked={showRoutesOnMap}
                onChange={e => setShowRoutesOnMap(e.target.checked)}
              />
              <Waypoints size={12} /> Mostrar rotas por dia no mapa
            </label>
          </div>

          {/* Location list grouped by day */}
          <div className="flex-1 overflow-y-auto p-3">
            <LocationsByDay locations={filtered} groupId={groupId!} isLoading={isLoading} />
          </div>
        </aside>

        {/* Map */}
        <main className={`flex-1 relative ${mobileView === 'map' ? 'block' : 'hidden sm:block'}`}>
          <TravelMap locations={filtered} center={mapCenter} groupId={groupId} showRoutes={showRoutesOnMap} />
        </main>
      </div>

      {/* Add location modal */}
      {showForm && <LocationForm groupId={groupId!} onClose={() => setShowForm(false)} />}

      {/* Suggested itinerary modal */}
      {showItinerary && (
        <ItineraryModal
          groupId={groupId!}
          locations={filtered}
          onClose={() => setShowItinerary(false)}
          onApplied={() => setShowRoutesOnMap(true)}
        />
      )}

      {/* Multi-day route export modal */}
      {showExportRoutes && (
        <ExportRoutesModal
          groupId={groupId!}
          locationIds={filtered.map((l: Location) => l.id)}
          onClose={() => setShowExportRoutes(false)}
        />
      )}

      {/* Edit group modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Editar Grupo</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do grupo</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Destino</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.destination}
                  onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => updateGroupMutation.mutate()}
                disabled={!editForm.name || !editForm.destination || updateGroupMutation.isPending}
                className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateGroupMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4">Compartilhar Grupo</h2>
            <p className="text-sm text-gray-600 mb-3">
              Envie o link abaixo para amigos/família. Ao abrir, eles poderão entrar
              automaticamente (ou criar conta) e já acessar o planejamento junto com você.
            </p>
            <button
              onClick={() => handleCopyLink(groupInfo?.shareKey ?? '')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <LinkIcon size={14} /> Copiar link de convite
            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mt-4">
              <p className="text-xs text-gray-500 mb-1">Ou use a chave de acesso</p>
              <p className="font-mono text-3xl font-bold text-indigo-600 tracking-widest">
                {groupInfo?.shareKey ?? '...'}
              </p>
            </div>
            <button
              onClick={() => handleCopyKey(groupInfo?.shareKey ?? '')}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <Copy size={14} /> Copiar apenas a chave
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






