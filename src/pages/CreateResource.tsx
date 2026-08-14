import { ResourceForm } from '../components/resources/ResourceForm';
import { CreateResourceInput } from '../types/resource';
import { createResource } from '../services/resources';
import { Truck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateResource() {
  const handleSubmit = async (data: CreateResourceInput): Promise<boolean> => {
    try {
      await createResource(data);
      return true;
    } catch (err: any) {
      throw err;
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/resources" className="text-[#FF4D00] hover:text-white transition">
          <ArrowLeft className="w-5 h-5 stroke-[3]" />
        </Link>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#FF4D00]" />
          <h1 className="font-archivo text-xl md:text-2xl text-white tracking-[-0.04em] uppercase">
            REGISTER FLEET RESOURCE UNIT
          </h1>
        </div>
      </div>

      <div className="glass-panel p-6 border-2 border-black">
        <ResourceForm
          mode="create"
          onSubmit={handleSubmit as any}
        />
      </div>
    </div>
  );
}
