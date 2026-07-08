/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  X, 
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { productService } from '../../../services/productService';
import { Product, ProductCategory } from '../../../types';
import { formatRupiah } from '../../../utils/format';

const CATEGORY_IMAGES = {
  Makanan: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
  Minuman: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
  Snack: 'https://images.unsplash.com/photo-1584776296984-48cd02b0c497?auto=format&fit=crop&w=600&q=80',
  'Paket Promo': 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Makanan');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Error/Success States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadProducts = async () => {
    const data = await productService.getProducts();
    setTimeout(() => {
      setProducts(data);
    }, 0);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Open modal for creating product
  const openCreateModal = () => {
    setName('');
    setCategory('Makanan');
    setPrice(0);
    setStock(0);
    setImageUrl('');
    setIsActive(true);
    setModalMode('create');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open modal for editing product
  const openEditModal = (prod: Product) => {
    setCurrentId(prod.id);
    setName(prod.name);
    setCategory(prod.category);
    setPrice(prod.price);
    setStock(prod.stock);
    setImageUrl(prod.imageUrl);
    setIsActive(prod.isActive);
    setModalMode('edit');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama produk wajib diisi.');
      return;
    }
    if (price <= 0) {
      setErrorMsg('Harga produk harus lebih besar dari Rp 0.');
      return;
    }
    if (stock < 0) {
      setErrorMsg('Stok produk tidak boleh bernilai negatif.');
      return;
    }

    // Set fallback image URL matching category if empty
    const finalImageUrl = imageUrl.trim() || CATEGORY_IMAGES[category];

    try {
      if (modalMode === 'create') {
        await productService.createProduct({
          name,
          category,
          price,
          stock,
          imageUrl: finalImageUrl,
          isActive,
        });
        setSuccessMsg('Produk baru berhasil ditambahkan!');
      } else if (modalMode === 'edit' && currentId) {
        await productService.updateProduct(currentId, {
          name,
          category,
          price,
          stock,
          imageUrl: finalImageUrl,
          isActive,
        });
        setSuccessMsg('Detail produk berhasil diperbarui!');
      }

      await loadProducts();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses data.');
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await productService.updateProduct(id, { isActive: !currentStatus });
    await loadProducts();
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini secara permanen?')) {
      await productService.deleteProduct(id);
      await loadProducts();
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Kelola Katalog Produk</h1>
          <p className="text-xs text-slate-400 mt-1">Tambah, edit, hapus, dan atur menu makanan, minuman, atau paket promomu.</p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* Filter and Search actions */}
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
          {['Semua', 'Makanan', 'Minuman', 'Snack', 'Paket Promo'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/25'
                  : 'bg-slate-900/50 text-slate-400 border border-slate-850 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table/Grid list */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-850 rounded-2xl">
          <p className="text-slate-500 text-xs">Belum ada produk yang ditambahkan.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-mono bg-slate-900/50">
                  <th className="p-4 font-bold uppercase tracking-wider">Gambar & Info</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Kategori</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Harga</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Stok</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className={`hover:bg-slate-850/20 transition-all ${!prod.isActive ? 'opacity-60' : ''}`}>
                    
                    {/* Image & Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={prod.imageUrl} 
                          alt={prod.name} 
                          className="w-10 h-10 object-cover rounded-lg bg-slate-950 border border-slate-800" 
                        />
                        <div>
                          <p className="font-bold text-white text-xs">{prod.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">ID: {prod.id.slice(5, 12)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-semibold text-slate-300">
                        {prod.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="p-4 font-bold text-slate-200">
                      {formatRupiah(prod.price)}
                    </td>

                    {/* Stock */}
                    <td className="p-4">
                      <span className={`font-mono font-bold ${
                        prod.stock === 0 
                          ? 'text-rose-400' 
                          : prod.stock <= 5 
                            ? 'text-amber-400' 
                            : 'text-slate-300'
                      }`}>
                        {prod.stock} unit
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(prod.id, prod.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          prod.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                            : 'bg-slate-950 text-slate-500 border-slate-850'
                        }`}
                      >
                        {prod.isActive ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 rounded-lg bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all"
                          title="Edit Produk"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 rounded-lg bg-slate-850 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRUD Pop-up Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full relative z-10 flex flex-col gap-5">
            {/* Modal Title */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
                <span>{modalMode === 'create' ? 'Tambah Produk Baru' : 'Edit Detail Produk'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Nasi Goreng Gila"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Kategori *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Paket Promo">Paket Promo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Harga (Rupiah) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
                    placeholder="15000"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Stok Inventaris *</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                    placeholder="20"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Status Penjualan</label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full py-2.5 rounded-lg border text-xs font-bold text-center transition-all ${
                      isActive 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                        : 'bg-slate-950 border-slate-850 text-slate-500'
                    }`}
                  >
                    {isActive ? 'Aktif (Ditampilkan)' : 'Nonaktif (Disembunyikan)'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">URL Gambar (Opsional)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Kosongkan untuk menggunakan gambar default kategori"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status messages */}
              {errorMsg && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end border-t border-slate-850 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-md text-xs"
                >
                  {modalMode === 'create' ? 'Tambah' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
