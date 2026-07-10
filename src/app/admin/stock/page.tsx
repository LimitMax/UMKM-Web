/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle,
  Package
} from 'lucide-react';
import { productService } from '../../../services/productService';
import { Product } from '../../../types';
import { useAuth } from '../../../components/AuthProvider';
import { realtimeService } from '../../../lib/services/realtimeService';

export default function AdminStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const loadProducts = async () => {
    const data = await productService.getProducts();
    setTimeout(() => {
      setProducts(data);
    }, 0);
  };

  const { profile } = useAuth();

  useEffect(() => {
    loadProducts();

    if (!profile) return;
    if (!profile.business_id) return;
    const bizId = profile.business_id;
    let debounceTimer: NodeJS.Timeout;

    const triggerReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadProducts, 500); // 500ms debounce
    };

    // Subscribe to realtime products changes
    const channel = realtimeService.subscribeToProductsByBusinessId(bizId, (payload) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Admin stock page realtime change:', payload.eventType);
      }
      triggerReload();
    });

    return () => {
      clearTimeout(debounceTimer);
      realtimeService.unsubscribeChannel(channel);
    };
  }, [profile]);

  // Adjust stock directly
  const handleAdjustStock = async (id: string, delta: number) => {
    await productService.adjustStock(id, delta);
    await loadProducts();
  };

  // Determine stock badge and style
  const getStockDetails = (stock: number) => {
    if (stock === 0) {
      return {
        label: 'Stok Habis',
        color: 'bg-rose-500/10 text-rose-400 border border-rose-500/15',
      };
    } else if (stock <= 5) {
      return {
        label: 'Stok Menipis',
        color: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
      };
    } else {
      return {
        label: 'Stok Cukup',
        color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
      };
    }
  };

  // Filter products by search query and stock status
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'Stok Cukup') {
      return p.stock > 5;
    } else if (statusFilter === 'Stok Menipis') {
      return p.stock > 0 && p.stock <= 5;
    } else if (statusFilter === 'Stok Habis') {
      return p.stock === 0;
    }
    return true;
  });

  // Calculate quick stats
  const totalSku = products.length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white">Kelola Stok & Inventaris</h1>
        <p className="text-xs text-slate-400 mt-1">Pantau ketersediaan produk makanan, minuman, dan lakukan penyesuaian stok secara cepat.</p>
      </div>

      {/* Stock Cards Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Total SKU Produk</span>
            <span className="text-white font-black text-lg">{totalSku} Terdaftar</span>
          </div>
          <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 text-slate-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Hampir Habis (&le; 5)</span>
            <span className={`font-black text-lg ${lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {lowStockCount} SKU
            </span>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            lowStockCount > 0 
              ? 'bg-amber-500/10 border-amber-500/10 text-amber-400' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-slate-500 uppercase font-bold">Habis Kosong (0)</span>
            <span className={`font-black text-lg ${outOfStockCount > 0 ? 'text-rose-450' : 'text-white'}`}>
              {outOfStockCount} SKU
            </span>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            outOfStockCount > 0 
              ? 'bg-rose-500/10 border-rose-500/10 text-rose-450' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['Semua', 'Stok Cukup', 'Stok Menipis', 'Stok Habis'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/25'
                  : 'bg-slate-900/50 text-slate-400 border border-slate-850 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-850 rounded-2xl">
          <p className="text-slate-500 text-xs">Produk tidak ditemukan.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-mono bg-slate-900/50">
                  <th className="p-4 font-bold uppercase tracking-wider">Produk</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Kategori</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Status Stok</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-center">Jumlah Stok</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-right">Sesuaikan Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredProducts.map((prod) => {
                  const badge = getStockDetails(prod.stock);
                  return (
                    <tr key={prod.id} className="hover:bg-slate-850/20 transition-all">
                      {/* Name info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                            {prod.imageUrl ? (
                              <img 
                                src={prod.imageUrl} 
                                alt={prod.name} 
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.opacity = '0';
                                }}
                                className="w-full h-full object-cover transition-opacity duration-300" 
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-slate-550 font-bold text-xs uppercase pointer-events-none -z-10">
                              {prod.name.substring(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">{prod.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">ID: {prod.id.slice(5, 12)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="text-slate-400">{prod.category}</span>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="p-4 text-center font-mono font-black text-sm text-slate-200">
                        {prod.stock}
                      </td>

                      {/* Stock Quick Adjustment */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAdjustStock(prod.id, -5)}
                            disabled={prod.stock < 5}
                            className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white border border-slate-800 transition-all font-mono font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Kurangi 5"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleAdjustStock(prod.id, -1)}
                            className="p-1 rounded bg-slate-800 text-slate-350 hover:text-white border border-slate-800 transition-all"
                            title="Kurangi 1"
                            disabled={prod.stock === 0}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleAdjustStock(prod.id, 1)}
                            className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/20 transition-all animate-none"
                            title="Tambah 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(prod.id, 5)}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/20 transition-all font-mono font-bold text-[10px]"
                            title="Tambah 5"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
