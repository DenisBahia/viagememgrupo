import { useQuery } from '@tanstack/react-query';
import { exportRoutes } from '../../services/api';
import { getDayColor } from '../ui/constants';
import toast from 'react-hot-toast';
import { X, ExternalLink, Copy, MapPinned } from 'lucide-react';

interface ExportRoutesModalProps {
  groupId: string;
  locationIds: string[];
  onClose: () => void;
}

export default function ExportRoutesModal({ groupId, locationIds, onClose }: ExportRoutesModalProps) {
  const { data: routes = [], isLoading, isError } = useQuery({
    queryKey: ['export-routes', groupId, locationIds.join(',')],
    queryFn: () => exportRoutes(groupId, locationIds),
    enabled: locationIds.length > 0,
    retry: false,
  });

  const dayLabels = routes.map(r => r.dayLabel);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const openAll = () => {
    routes.forEach((r, i) => setTimeout(() => window.open(r.url, '_blank'), i * 400));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <MapPinned size={18} className="text-green-600" /> Exportar Rotas
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-2">
          <p className="text-xs text-gray-500 mb-2">
            Um link de rota do Google Maps por dia, considerando apenas os locais que estão visíveis com os filtros atuais.
          </p>

          {isLoading && <p className="text-sm text-gray-400 text-center py-6">Carregando...</p>}
          {isError && <p className="text-sm text-red-500 text-center py-6">Erro ao gerar rotas. Adicione locais primeiro.</p>}

          {routes.length > 1 && (
            <button
              onClick={openAll}
              className="w-full flex items-center justify-center gap-2 py-2 mb-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <ExternalLink size={14} /> Abrir todas as rotas ({routes.length})
            </button>
          )}

          {routes.map(route => {
            const color = getDayColor(route.dayLabel, dayLabels);
            return (
              <div key={route.dayLabel} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{route.dayLabel}</p>
                  <p className="text-xs text-gray-400">{route.stopsCount} local(is)</p>
                </div>
                <button onClick={() => handleCopy(route.url)} className="text-gray-400 hover:text-gray-600 p-1" title="Copiar link">
                  <Copy size={14} />
                </button>
                <a href={route.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 p-1" title="Abrir rota">
                  <ExternalLink size={14} />
                </a>
              </div>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

