import { useParams, Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { ResourceForm } from '../components/resources/ResourceForm';
import { UpdateResourceInput } from '../types/resource';
import { Loader, AlertCircle, ArrowLeft, Edit2 } from 'lucide-react';

export default function EditResourcePage() {
  const { id } = useParams<{ id: string }>();
  const { resource, loading, error, refetch, editResource } = useResource(id);

  const handleSubmit = async (data: UpdateResourceInput): Promise<boolean> => {
    return await editResource(data);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4 font-space">
        <Loader className="w-8 h-8 animate-spin text-[#FF4D00]" />
        <p className="text-xs uppercase font-bold tracking-wider">LOADING FLEET DATA...</p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="space-y-4 px-4 md:px-8 py-6 max-w-4xl mx-auto">
        <Link to="/resources" className="font-space text-xs text-[#FF4D00] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4 stroke-[3]" />
          BACK TO FLEET REGISTRY
        </Link>
        <div className="glass-panel border-2 border-red-500 bg-red-950/20 p-10 text-center space-y-3 font-space">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="font-archivo text-xl text-white uppercase">RESOURCE NOT FOUND</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to load this resource unit for editing.'}</p>
          <button onClick={refetch} className="px-4 py-2 bg-[#FF4D00] text-black font-bold uppercase text-xs">
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to={`/resources/${id}`} className="text-[#FF4D00] hover:text-white transition">
          <ArrowLeft className="w-5 h-5 stroke-[3]" />
        </Link>
        <div className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-[#FF4D00]" />
          <h1 className="font-archivo text-xl md:text-2xl text-white tracking-[-0.04em] uppercase">
            EDIT RESOURCE: <span className="font-space text-[#FF4D00]">{resource.resourceCode}</span>
          </h1>
        </div>
      </div>

      <div className="glass-panel p-6 border-2 border-black">
        <ResourceForm
          mode="edit"
          initialData={resource}
          onSubmit={handleSubmit as any}
        />
      </div>
    </div>
  );
}
