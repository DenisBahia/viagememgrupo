import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLocationAiTips } from '../../services/api';
import { Sparkles, X, Loader2, RefreshCw, Clock3, MapPin, Database } from 'lucide-react';
import type { Location } from '../../types';

interface AiTipsModalProps {
  location: Location;
  onClose: () => void;
}

// Small markdown-ish renderer: supports headings, bold and bullet lines without extra deps.
function renderContent(content: string) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="text-gray-800">{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const blocks: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-2">
        {bullets}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bullets.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-sm text-slate-700 leading-relaxed">
          {renderInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    flushBullets();

    if (trimmed.startsWith('#')) {
      blocks.push(
        <p key={`h-${i}`} className="font-semibold text-slate-900 text-sm mt-2">
          {renderInline(trimmed.replace(/^#+\s*/, ''))}
        </p>
      );
      return;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-sm text-slate-700 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushBullets();
  return blocks;
}

export default function AiTipsModal({ location, onClose }: AiTipsModalProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['location-ai-tips', location.id],
    queryFn: () => getLocationAiTips(location.id),
    staleTime: Infinity, // backend already caches per location; avoid re-fetching in this session
    retry: false,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">
                  <Sparkles size={14} />
                </span>
                <h3 className="font-semibold text-slate-900 text-base truncate">Dicas de IA</h3>
              </div>
              <p className="mt-1 text-sm text-slate-700 font-medium truncate">{location.name}</p>
              <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1 truncate">
                <MapPin size={12} className="flex-shrink-0" />
                {location.address}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {data && (
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                  data.fromCache
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {data.fromCache ? <Database size={11} /> : <Sparkles size={11} />}
                  {data.fromCache ? 'Cache' : 'Gerado agora'}
                </span>
              )}

              <button
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(85vh-84px)]">
          {isLoading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <p className="text-sm font-medium text-slate-800">Buscando dicas com IA...</p>
              <p className="text-xs text-slate-500 mt-1">Isso pode levar alguns segundos.</p>
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
              <p className="text-sm text-red-700 font-medium">
                {(error as any)?.response?.data?.message ?? 'Não foi possível buscar as dicas agora.'}
              </p>
              {(error as any)?.response?.data?.detail && (
                <p className="text-xs text-red-700/80 whitespace-pre-wrap">
                  {(error as any)?.response?.data?.detail}
                </p>
              )}
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition"
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                {renderContent(data.content)}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={12} />
                  {new Date(data.generatedAt).toLocaleString('pt-BR')}
                </span>
                <span>{data.fromCache ? 'Resultado vindo do cache' : 'Resultado recém-gerado'}</span>
              </div>
            </div>
          )}

          {isFetching && !isLoading && (
            <div className="mt-3 text-xs text-slate-400 inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Atualizando...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


