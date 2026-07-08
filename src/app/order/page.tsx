/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle,
  CheckCircle,
  CreditCard,
  Wallet,
  DollarSign
} from 'lucide-react';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import { Product, ProductCategory, OrderItem, PaymentMethod } from '../../types';
import { formatRupiah } from '../../utils/format';

export default function CustomerOrderPage() {
  const router = useRouter();
  
  // Page states
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  
  // Checkout form states
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      const activeProds = await productService.getActiveProducts();
      setProducts(activeProds);
    };
    loadProducts();
  }, []);

  // Filter categories
  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Paket Promo'];

  // Filter products by category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // limit to stock
        if (existing.quantity >= product.stock) {
          setErrorMsg(`Maaf, stok ${product.name} terbatas hanya ${product.stock} porsi.`);
          setTimeout(() => setErrorMsg(''), 4000);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            // Limit to product stock
            if (nextQty > item.product.stock) {
              setErrorMsg(`Maaf, stok ${item.product.name} terbatas.`);
              setTimeout(() => setErrorMsg(''), 4000);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Handle Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Nama lengkap wajib diisi untuk antrean.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi untuk konfirmasi.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Keranjang belanja Anda masih kosong.');
      return;
    }

    setIsLoading(true);

    try {
      // Structure the order item list
      const items: OrderItem[] = cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      // Create the order via service (reduces stock internally)
      const order = await orderService.createOrder({
        customerName,
        customerPhone,
        notes: orderNotes,
        items,
        paymentMethod,
      });

      // Clear cart
      setCart([]);
      
      // Redirect to success page
      router.push(`/order/success/${order.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-white">Menu Pesanan</h1>
              <p className="text-xs text-emerald-400 font-mono">Pesan Mandiri & Cepat</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Product catalog */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari makanan, kopi, atau paket hemat..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-500 text-sm">Produk tidak ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => (
                <div 
                  key={prod.id} 
                  className={`bg-slate-900/50 border rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col ${
                    prod.stock === 0 ? 'border-slate-900 opacity-60' : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Image container */}
                  <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
                    <img 
                      src={prod.imageUrl} 
                      alt={prod.name}
                      className="object-cover w-full h-full transform hover:scale-105 transition-all duration-500" 
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-[10px] font-semibold text-slate-300">
                      {prod.category}
                    </span>
                    {prod.stock === 0 ? (
                      <span className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-xs text-rose-400 tracking-wider">
                        HABIS
                      </span>
                    ) : prod.stock <= 5 ? (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-amber-500/80 text-[10px] font-black text-slate-950">
                        Sisa {prod.stock}
                      </span>
                    ) : null}
                  </div>

                  {/* Body details */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-white line-clamp-2 leading-snug">
                        {prod.name}
                      </h4>
                      <p className="text-emerald-400 font-bold text-sm mt-1">
                        {formatRupiah(prod.price)}
                      </p>
                    </div>

                    <button
                      disabled={prod.stock === 0}
                      onClick={() => addToCart(prod)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                        prod.stock === 0
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
                      }`}
                    >
                      {prod.stock === 0 ? 'Stok Habis' : 'Tambah +'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Desktop Checkout sidebar (visible on desktop) */}
        <div className="hidden md:block w-96 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit sticky top-24">
          <h2 className="font-bold text-base text-white flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Keranjang Belanja</span>
          </h2>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Keranjang masih kosong. Pilih menu di sebelah kiri.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Cart List */}
              <div className="max-h-60 overflow-y-auto pr-1 flex flex-col gap-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/50">
                    <div className="flex-1 pr-2">
                      <p className="text-xs font-semibold text-white line-clamp-1">{item.product.name}</p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{formatRupiah(item.product.price)}</p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 ml-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-3">
                <div className="flex justify-between font-bold text-sm text-white mb-4">
                  <span>Total Bayar:</span>
                  <span className="text-emerald-400">{formatRupiah(totalAmount)}</span>
                </div>
                
                {/* Checkout form */}
                <form onSubmit={handleCheckout} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">No. WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan Pesanan</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Contoh: Level 5, tidak pakai sayur, es batu dipisah"
                      rows={2}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                  
                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-2">Metode Pembayaran *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Cash', label: 'Tunai', icon: DollarSign },
                        { id: 'QRIS', label: 'QRIS', icon: Wallet },
                        { id: 'Bank Transfer', label: 'Transfer', icon: CreditCard },
                      ].map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4 mb-1" />
                            <span className="text-[10px]">{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5 mt-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-sm mt-3"
                  >
                    {isLoading ? 'Memproses...' : 'Konfirmasi & Bayar'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar (Visible on mobile when cart has items) */}
      {totalItemsCount > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 z-30 shadow-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold">{totalItemsCount} Item</p>
            <p className="text-emerald-400 font-black text-base leading-none mt-1">{formatRupiah(totalAmount)}</p>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all"
          >
            Lanjut Bayar
          </button>
        </div>
      )}

      {/* Slide-over Mobile Drawer for Checkout Form */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Overlay */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />
          
          {/* Content Wrapper */}
          <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col z-10 animate-slide-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>Keranjang Anda</span>
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800"
              >
                Tutup
              </button>
            </div>

            {/* List and checkout inputs */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Keranjang belanja masih kosong.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/50">
                        <div className="flex-1 pr-2">
                          <p className="text-xs font-semibold text-white line-clamp-1">{item.product.name}</p>
                          <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{formatRupiah(item.product.price)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 rounded bg-slate-800 text-slate-300"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 rounded bg-slate-800 text-slate-300"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-slate-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 pt-4 flex flex-col gap-4">
                    <div className="flex justify-between font-bold text-sm text-white">
                      <span>Total Bayar:</span>
                      <span className="text-emerald-400">{formatRupiah(totalAmount)}</span>
                    </div>

                    <form onSubmit={handleCheckout} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Lengkap *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Budi Santoso"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">No. WhatsApp *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="08123456789"
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan</label>
                        <textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="Rasa pedas sedang, es teh manis jumbo"
                          rows={2}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-2">Metode Pembayaran *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'Cash', label: 'Tunai', icon: DollarSign },
                            { id: 'QRIS', label: 'QRIS', icon: Wallet },
                            { id: 'Bank Transfer', label: 'Transfer', icon: CreditCard },
                          ].map((method) => {
                            const Icon = method.icon;
                            const isSelected = paymentMethod === method.id;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                                  isSelected
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <Icon className="w-4 h-4 mb-1" />
                                <span className="text-[10px]">{method.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-550 text-slate-950 font-bold rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider mt-2"
                      >
                        {isLoading ? 'Memproses...' : 'Konfirmasi & Bayar'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
