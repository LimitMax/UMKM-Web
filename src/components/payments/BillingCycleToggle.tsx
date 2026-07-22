import { FC } from 'react';

interface BillingCycleToggleProps {
  value: 'monthly' | 'annual';
  onChange: (v: 'monthly' | 'annual') => void;
}

export const BillingCycleToggle: FC<BillingCycleToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex w-full justify-center">
      <div
        role="group"
        aria-label="Pilih siklus pembayaran"
        className="inline-flex rounded-full bg-slate-800 p-0.5"
      >
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors 
            ${value === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Bulanan
        </button>
        <button
          type="button"
          onClick={() => onChange('annual')}
          className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center 
            ${value === 'annual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Tahunan
          <span className="ml-1 bg-emerald-500 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
            Gratis 1 Bulan
          </span>
        </button>
      </div>
    </div>
  );
};
