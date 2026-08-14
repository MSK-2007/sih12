import { useParams, Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { ResourceDetails } from '../components/resources/ResourceDetails';
import { ResourceStatus } from '../types/resource';
import { Loader, AlertCircle, ArrowLeft, Truck } from 'lucide-react';

export default function ResourceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { resource, loading, error, refetch, changeStatus } = useResource(id);

  const handleStatusChange = async (newStatus: ResourceStatus): Promise<boolean> => {
    return await changeStatus(newStatus);
  };

  if (loading) {
    return (
      <div className="p-16 text-center max-w-4xl mx-auto font-space">
        <Loader className="w-8 h-8 animate-spin text-[#FF4D00] mx-auto mb-3" />
        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">LOADING FLEET UNIT SPECIFICATIONS...</p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center glass-panel border-2 border-red-500 my-12 font-space space-y-3">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="font-archivo text-xl text-white uppercase">RESOURCE NOT FOUND</h2>
        <p className="text-xs text-slate-400">{error || 'The requested resource unit could not be located.'}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-full bg-[#FF4D00] text-black text-xs font-bold uppercase inline-flex items-center gap-1.5 transition border border-black"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/resources" className="text-[#FF4D00] hover:text-white transition">
          <ArrowLeft className="w-5 h-5 stroke-[3]" />
        </Link>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#FF4D00]" />
          <h1 className="font-archivo text-xl md:text-2xl text-white tracking-[-0.04em] uppercase">
            FLEET UNIT: <span className="font-space text-[#FF4D00]">{resource.resourceCode}</span>
          </h1>
        </div>
      </div>

      <ResourceDetails
        resource={resource}
        onStatusChange={handleStatusChange}
        onRefetch={refetch}
      />
    </div>
  );
}
