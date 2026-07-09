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
  ArrowRight,
  Sparkles, 
  AlertCircle,
  CheckCircle,
  CreditCard,
  Wallet,
  DollarSign,
  MapPin,
  Phone,
  Clock
} from 'lucide-react';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import { businessService } from '../../services/businessService';
import DemoRoleSwitcher from '../../components/DemoRoleSwitcher';
import { Product, ProductCategory, OrderItem, PaymentMethod, BusinessProfile, FulfillmentType } from '../../types';
import { formatRupiah } from '../../utils/format';
import { calculateOrderTotals } from '../../utils/calculations';
import { previewOrderEta, getEtaLabel, formatEtaDisplay } from '../../utils/etaHelpers';

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
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('dine_in');
  const [recipientName, setRecipientName] = useState<string>('');
  const [deliveryPhone, setDeliveryPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number>(0);
  const [deliveryDistanceSource, setDeliveryDistanceSource] = useState<string>('manual');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load products on mount
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      const activeProds = await productService.getActiveProducts();
      setProducts(activeProds);
    };
    const loadProfile = () => {
      const profile = businessService.getProfile();
      setBusinessProfile(profile);
    };
    loadProducts();
    loadProfile();
  }, []);

  // Filter categories
  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Paket Promo'];

  // Filter products by category and search query
  const filteredProducts = products.filter((p) => {
    const isActive = p.isActive !== false;
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return isActive && matchesCategory && matchesSearch;
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

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  
  const totals = calculateOrderTotals({
    subtotal,
    fulfillmentType,
    taxEnabled: businessProfile?.taxEnabled ?? false,
    taxPercentage: businessProfile?.taxPercentage ?? 10,
    serviceChargeEnabled: businessProfile?.serviceChargeEnabled ?? false,
    serviceChargePercentage: businessProfile?.serviceChargePercentage ?? 5,
    deliverySettings: businessProfile?.deliverySettings,
    deliveryDistanceKm: fulfillmentType === 'delivery' ? deliveryDistanceKm : undefined,
  });

  const serviceCharge = totals.serviceChargeAmount;
  const tax = totals.taxAmount;
  const deliveryFee = totals.deliveryFeeAmount;
  const deliveryAdminFee = totals.deliveryAdminFeeAmount;
  const freeDeliveryApplied = totals.freeDeliveryApplied;
  const totalAmount = totals.totalAmount;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Handle Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Nama lengkap wajib diisi untuk antrean.');
      return;
    }

    if (customerPhone.trim()) {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 14) {
        setErrorMsg('Nomor WhatsApp harus berupa angka 9-14 digit.');
        return;
      }
    }

    // Delivery-specific validations
    if (fulfillmentType === 'delivery') {
      if (!recipientName.trim()) {
        setErrorMsg('Nama penerima wajib diisi untuk pengiriman.');
        return;
      }
      if (!deliveryPhone.trim()) {
        setErrorMsg('Nomor WhatsApp penerima wajib diisi.');
        return;
      }
      const cleanDelivPhone = deliveryPhone.replace(/\D/g, '');
      if (cleanDelivPhone.length < 9 || cleanDelivPhone.length > 14) {
        setErrorMsg('Nomor WhatsApp penerima harus berupa angka 9-14 digit.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setErrorMsg('Alamat lengkap pengiriman wajib diisi.');
        return;
      }

      // Distance-based calculation validations
      const calcType = businessProfile?.deliverySettings?.deliveryFeeCalculationType || 'fixed';
      if (calcType === 'distance_based') {
        if (deliveryDistanceKm <= 0 || isNaN(deliveryDistanceKm)) {
          setErrorMsg('Jarak pengiriman wajib ditentukan.');
          return;
        }
        const maxDist = businessProfile?.deliverySettings?.maxDeliveryDistanceKm ?? 10;
        if (deliveryDistanceKm > maxDist) {
          setErrorMsg(`Jarak pengiriman (${deliveryDistanceKm} KM) melebihi batas maksimal (${maxDist} KM).`);
          return;
        }
      }
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
        fulfillmentType,
        recipientName: fulfillmentType === 'delivery' ? recipientName : undefined,
        deliveryPhone: fulfillmentType === 'delivery' ? deliveryPhone : undefined,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
        deliveryNotes: fulfillmentType === 'delivery' ? deliveryNotes : undefined,
        deliveryDistanceKm: fulfillmentType === 'delivery' ? deliveryDistanceKm : undefined,
        deliveryDistanceSource: fulfillmentType === 'delivery' ? deliveryDistanceSource : undefined,
        deliveryFeeCalculationType: fulfillmentType === 'delivery' ? (businessProfile?.deliverySettings?.deliveryFeeCalculationType || 'fixed') : undefined,
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

  const renderDistanceWidget = () => {
    const calcType = businessProfile?.deliverySettings?.deliveryFeeCalculationType || 'fixed';
    if (calcType !== 'distance_based') return null;

    const maxDist = businessProfile?.deliverySettings?.maxDeliveryDistanceKm ?? 10;
    const calcMode = businessProfile?.deliverySettings?.distanceCalculationMode || 'manual';

    const handleSimulateDistance = () => {
      // simulate distance between 1 and maxDist
      const randomDist = Number((Math.random() * (maxDist - 1) + 1).toFixed(1));
      setDeliveryDistanceKm(randomDist);
      setDeliveryDistanceSource('mock');
    };

    return (
      <div className="flex flex-col gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg mt-2 font-mono">
        <div className="flex justify-between items-center">
          <label className="block text-[9px] font-mono text-slate-400 uppercase">
            Estimasi Jarak dari Toko (KM) *
          </label>
          <span className="text-[9px] font-mono text-emerald-450 font-bold uppercase">
            Maks: {maxDist} KM
          </span>
        </div>

        {calcMode === 'manual' ? (
          <div className="flex flex-col gap-1">
            <input
              type="number"
              min="0.1"
              step="0.1"
              required
              value={deliveryDistanceKm || ''}
              onChange={(e) => {
                setDeliveryDistanceKm(Number(e.target.value));
                setDeliveryDistanceSource('manual');
              }}
              placeholder="Masukkan jarak dalam KM (contoh: 3.5)..."
              className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 text-center"
            />
            <span className="text-[9px] text-slate-500 italic block leading-normal font-sans">
              💡 Jarak diisi manual untuk keperluan demo.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                disabled
                value={deliveryDistanceKm > 0 ? `${deliveryDistanceKm} KM` : 'Belum dihitung'}
                className="flex-1 p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-400 text-center font-bold"
              />
              <button
                type="button"
                onClick={handleSimulateDistance}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer"
              >
                Simulasikan Jarak
              </button>
            </div>
            <span className="text-[9px] text-slate-500 italic block leading-normal font-sans">
              💡 Klik button di atas untuk menyimulasikan jarak secara acak.
            </span>
          </div>
        )}

        {deliveryDistanceKm > maxDist && (
          <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] leading-relaxed font-sans">
            ⚠️ Jarak pengiriman melebihi batas maksimal ({maxDist} KM).
          </div>
        )}

        {deliveryDistanceKm > 0 && deliveryDistanceKm <= maxDist && (
          <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono mt-1 pt-1 border-t border-slate-800">
            <span>Estimasi Ongkir:</span>
            <strong>{freeDeliveryApplied ? 'Gratis Ongkir' : formatRupiah(deliveryFee)}</strong>
          </div>
        )}
      </div>
    );
  };

  const isDistanceInvalid = fulfillmentType === 'delivery' && 
    (businessProfile?.deliverySettings?.deliveryFeeCalculationType === 'distance_based') && 
    (deliveryDistanceKm <= 0 || deliveryDistanceKm > (businessProfile?.deliverySettings?.maxDeliveryDistanceKm ?? 10) || isNaN(deliveryDistanceKm));

  const isCheckoutDisabled = isLoading || isDistanceInvalid;

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
              <h1 className="font-bold text-lg text-white">
                {businessProfile ? businessProfile.businessName : 'Menu Pesanan'}
              </h1>
              <p className="text-xs text-emerald-400 font-mono">Pesan Mandiri & Cepat</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DemoRoleSwitcher />
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
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Product catalog */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Business Profile Hero Banner */}
          {businessProfile && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Logo */}
              {businessProfile.logoUrl ? (
                <img 
                  src={businessProfile.logoUrl} 
                  alt={businessProfile.businessName} 
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-slate-950 border border-slate-850 flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black text-xl sm:text-2xl flex-shrink-0">
                  {businessProfile.businessName.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Info details */}
              <div className="flex-1 text-center sm:text-left flex flex-col gap-2">
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="text-lg md:text-xl font-black text-white leading-tight">{businessProfile.businessName}</h2>
                    {businessProfile.businessType && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {businessProfile.businessType}
                      </span>
                    )}
                  </div>
                  {businessProfile.description && (
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                      {businessProfile.description}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 mt-1 border-t border-slate-850 pt-2.5 text-[11px] text-slate-500">
                  {businessProfile.openingHours && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Buka: <strong className="text-slate-350">{businessProfile.openingHours}</strong></span>
                    </span>
                  )}
                  {businessProfile.whatsappNumber && (
                    <a 
                      href={`https://wa.me/${businessProfile.whatsappNumber.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Hubungi: <strong className="text-slate-350">{businessProfile.whatsappNumber}</strong></span>
                    </a>
                  )}
                  {businessProfile.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Alamat: <strong className="text-slate-355">{businessProfile.address}</strong></span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
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
                    {prod.imageUrl ? (
                      <img 
                        src={prod.imageUrl} 
                        alt={prod.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.opacity = '0';
                        }}
                        className="object-cover w-full h-full transform hover:scale-105 transition-all duration-500" 
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-slate-500 font-black text-xl uppercase pointer-events-none -z-10">
                      {prod.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-[10px] font-semibold text-slate-350">
                      {prod.category}
                    </span>
                    {prod.stock === 0 ? (
                      <span className="absolute inset-0 bg-black/75 flex items-center justify-center font-bold text-xs text-rose-450 tracking-wider">
                        HABIS
                      </span>
                    ) : prod.stock <= 5 ? (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-amber-550 text-[9px] font-black text-slate-950 uppercase tracking-wide">
                        Stok Terbatas
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
        <div className="hidden md:flex w-96 bg-slate-900 border border-slate-800 rounded-2xl p-4 h-[calc(100vh-100px)] sticky top-20 flex-col min-h-0">
          <h2 className="font-bold text-base text-white flex items-center gap-2 mb-2.5 flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Keranjang Belanja</span>
          </h2>

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-8 text-slate-500 text-xs">
              Keranjang masih kosong. Pilih menu di sebelah kiri.
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable middle container (Cart list and inputs) */}
              <div className="flex-1 overflow-y-auto pr-1 pb-3 flex flex-col gap-3 min-h-0 scrollbar-thin">
                {/* Cart List */}
                <div className="flex flex-col gap-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                      <div className="flex-1 pr-2">
                        <p className="text-xs font-semibold text-white line-clamp-1">{item.product.name}</p>
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{formatRupiah(item.product.price)}</p>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 ml-1 text-slate-550 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Fields */}
                <div className="flex flex-col gap-3 border-t border-slate-850 pt-3 mt-1">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">No. WhatsApp (Opsional)</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan Pesanan</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Contoh: Level 5, tidak pakai sayur, es batu dipisah"
                      rows={2}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-sans"
                    />
                  </div>
                  
                  {/* Metode Fulfillment */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Metode Pelayanan *</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'dine_in', label: 'Makan di Tempat', icon: Clock },
                        { id: 'pickup', label: 'Ambil Sendiri', icon: ShoppingBag },
                        ...(businessProfile?.deliverySettings?.deliveryEnabled ?? true
                          ? [{ id: 'delivery', label: 'Delivery', icon: MapPin }]
                          : [])
                      ].map((method) => {
                        const Icon = method.icon;
                        const isSelected = fulfillmentType === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setFulfillmentType(method.id as FulfillmentType)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 mb-1" />
                            <span className="text-[9px]">{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Form (Conditional) */}
                  {fulfillmentType === 'delivery' && (
                    <div className="flex flex-col gap-2.5 p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl animate-fade-in">
                      <div className="border-b border-slate-850 pb-1 mb-0.5">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Detail Pengiriman</span>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Nama Penerima *</label>
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Nama penerima..."
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">No. WhatsApp Penerima *</label>
                        <input
                          type="tel"
                          required
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Alamat Lengkap *</label>
                        <textarea
                          required
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Jalan, RT/RW, kelurahan..."
                          rows={2}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Catatan Pengantaran (Opsional)</label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Contoh: Pagar warna hitam"
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      {renderDistanceWidget()}
                    </div>
                  )}

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Metode Pembayaran *</label>
                    <div className="grid grid-cols-3 gap-1.5">
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
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 mb-1" />
                            <span className="text-[9px]">{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-slate-450 font-sans mt-2 italic leading-relaxed">
                      {paymentMethod === 'Cash' && '💡 Tunai: Bayar di kasir saat pesanan diambil'}
                      {paymentMethod === 'QRIS' && '💡 QRIS: Scan QRIS di kasir setelah checkout'}
                      {paymentMethod === 'Bank Transfer' && '💡 Transfer: Konfirmasi pembayaran ke kasir'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky bottom totals and checkout trigger inside form */}
              <div className="border-t border-slate-800 pt-2.5 mt-auto bg-slate-900 flex-shrink-0">
                <div className="flex flex-col gap-1 mb-2.5">
                  <div className="flex justify-between text-xs text-slate-450">
                    <span>Subtotal:</span>
                    <span className="text-slate-300">{formatRupiah(subtotal)}</span>
                  </div>
                  {businessProfile?.serviceChargeEnabled && (
                    <div className="flex justify-between text-xs text-slate-455">
                      <span>Biaya Layanan ({businessProfile.serviceChargePercentage}%):</span>
                      <span className="text-slate-300">{formatRupiah(serviceCharge)}</span>
                    </div>
                  )}
                  {businessProfile?.taxEnabled && (
                    <div className="flex justify-between text-xs text-slate-455">
                      <span>Pajak ({businessProfile.taxPercentage}%):</span>
                      <span className="text-slate-300">{formatRupiah(tax)}</span>
                    </div>
                  )}
                  {fulfillmentType === 'delivery' && (
                    <>
                      <div className="flex justify-between text-xs text-slate-455">
                        <span>Ongkos Kirim:</span>
                        {freeDeliveryApplied ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 line-through text-[10px]">{formatRupiah(businessProfile?.deliverySettings?.deliveryFeeAmount ?? 0)}</span>
                            <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold border border-emerald-500/20">Gratis Ongkir</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">{formatRupiah(deliveryFee)}</span>
                        )}
                      </div>
                      {deliveryAdminFee > 0 && (
                        <div className="flex justify-between text-xs text-slate-455">
                          <span>Biaya Admin Delivery:</span>
                          <span className="text-slate-300">{formatRupiah(deliveryAdminFee)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between font-bold text-xs text-white border-t border-slate-850 pt-2 mt-1">
                    <span>Total Bayar:</span>
                    <span className="text-emerald-400 text-sm">{formatRupiah(totalAmount)}</span>
                  </div>
                </div>

                {/* ETA Preview Badge — Phase 6.8 */}
                {businessProfile?.etaSettings?.etaEnabled && cart.length > 0 && (() => {
                  const settings = businessProfile.etaSettings!;
                  const distKm = fulfillmentType === 'delivery' && deliveryDistanceKm > 0 ? deliveryDistanceKm : undefined;
                  const eta = previewOrderEta(fulfillmentType, settings, distKm);
                  const label = getEtaLabel(fulfillmentType);
                  const displayStr = formatEtaDisplay(eta.totalMinutes, eta.estimatedAtIso, settings.etaDisplayMode);
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-amber-500/8 border border-amber-500/20">
                      <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/70">{label}</span>
                        <span className="text-[10px] font-bold text-amber-300">
                          {displayStr}
                          {eta.distanceMissing && fulfillmentType === 'delivery' && (
                            <span className="ml-1 text-amber-400/50 font-normal">(jarak belum diisi)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {errorMsg && (
                  <div className="p-2 mb-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCheckoutDisabled}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {isLoading ? 'Memproses...' : 'Konfirmasi & Bayar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar (Visible on mobile when cart has items) */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-4 inset-x-4 z-40 animate-slide-up">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-3.5 rounded-2xl flex items-center justify-between shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="bg-slate-950 text-emerald-400 text-xs font-black px-2.5 py-1 rounded-lg">
                {totalItemsCount}
              </span>
              <div className="text-left">
                <span className="block text-[9px] uppercase font-mono text-slate-900 font-bold tracking-wider leading-none">Total Belanja</span>
                <span className="text-sm font-black">{formatRupiah(totalAmount)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 font-bold text-xs">
              <span>Lihat Keranjang</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
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
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* List and checkout inputs */}
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center py-12 text-slate-500 text-xs">
                Keranjang belanja masih kosong.
              </div>
            ) : (
              <form onSubmit={handleCheckout} className="flex-1 flex flex-col min-h-0">
                {/* Scrollable middle container */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 scrollbar-thin">
                  {/* Cart List */}
                  <div className="flex flex-col gap-2">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <div className="flex-1 pr-2">
                          <p className="text-xs font-semibold text-white line-clamp-1">{item.product.name}</p>
                          <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{formatRupiah(item.product.price)}</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 rounded bg-slate-800 text-slate-300 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 rounded bg-slate-800 text-slate-300 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-slate-500 hover:text-rose-450 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Form fields */}
                  <div className="flex flex-col gap-3 border-t border-slate-850 pt-3 mt-1">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Budi Santoso"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">No. WhatsApp (Opsional)</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="08123456789"
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan</label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Rasa pedas sedang, es teh manis jumbo"
                        rows={2}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-sans"
                      />
                    </div>

                    {/* Metode Fulfillment */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Metode Pelayanan *</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'dine_in', label: 'Makan di Tempat', icon: Clock },
                          { id: 'pickup', label: 'Ambil Sendiri', icon: ShoppingBag },
                          ...(businessProfile?.deliverySettings?.deliveryEnabled ?? true
                            ? [{ id: 'delivery', label: 'Delivery', icon: MapPin }]
                            : [])
                        ].map((method) => {
                          const Icon = method.icon;
                          const isSelected = fulfillmentType === method.id;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setFulfillmentType(method.id as FulfillmentType)}
                              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                  : 'bg-slate-955 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 mb-1" />
                              <span className="text-[9px]">{method.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery Form (Conditional) */}
                    {fulfillmentType === 'delivery' && (
                      <div className="flex flex-col gap-2.5 p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl animate-fade-in">
                        <div className="border-b border-slate-850 pb-1 mb-0.5">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Detail Pengiriman</span>
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Nama Penerima *</label>
                          <input
                            type="text"
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Nama penerima..."
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">No. WhatsApp Penerima *</label>
                          <input
                            type="tel"
                            required
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            placeholder="Contoh: 08123456789"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Alamat Lengkap *</label>
                          <textarea
                            required
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Jalan, RT/RW, kelurahan..."
                            rows={2}
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Catatan Pengantaran (Opsional)</label>
                          <input
                            type="text"
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Contoh: Pagar warna hitam"
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        {renderDistanceWidget()}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Metode Pembayaran *</label>
                      <div className="grid grid-cols-3 gap-1.5">
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
                              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 mb-1" />
                              <span className="text-[9px]">{method.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-455 font-sans mt-2 italic leading-relaxed">
                        {paymentMethod === 'Cash' && '💡 Tunai: Bayar di kasir saat pesanan diambil'}
                        {paymentMethod === 'QRIS' && '💡 QRIS: Scan QRIS di kasir setelah checkout'}
                        {paymentMethod === 'Bank Transfer' && '💡 Transfer: Konfirmasi pembayaran ke kasir'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sticky Bottom Footer for totals and pay CTA inside form */}
                <div className="p-4 bg-slate-950 border-t border-slate-850 flex-shrink-0">
                  <div className="flex flex-col gap-1 mb-2.5">
                    <div className="flex justify-between text-xs text-slate-450">
                      <span>Subtotal:</span>
                      <span className="text-slate-300">{formatRupiah(subtotal)}</span>
                    </div>
                    {businessProfile?.serviceChargeEnabled && (
                      <div className="flex justify-between text-xs text-slate-455">
                        <span>Biaya Layanan ({businessProfile.serviceChargePercentage}%):</span>
                        <span className="text-slate-300">{formatRupiah(serviceCharge)}</span>
                      </div>
                    )}
                    {businessProfile?.taxEnabled && (
                      <div className="flex justify-between text-xs text-slate-455">
                        <span>Pajak ({businessProfile.taxPercentage}%):</span>
                        <span className="text-slate-300">{formatRupiah(tax)}</span>
                      </div>
                    )}
                    {fulfillmentType === 'delivery' && (
                      <>
                        <div className="flex justify-between text-xs text-slate-455">
                          <span>Ongkos Kirim:</span>
                          {freeDeliveryApplied ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 line-through text-[10px]">{formatRupiah(businessProfile?.deliverySettings?.deliveryFeeAmount ?? 0)}</span>
                              <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold border border-emerald-500/20">Gratis Ongkir</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">{formatRupiah(deliveryFee)}</span>
                          )}
                        </div>
                        {deliveryAdminFee > 0 && (
                          <div className="flex justify-between text-xs text-slate-455">
                            <span>Biaya Admin Delivery:</span>
                            <span className="text-slate-300">{formatRupiah(deliveryAdminFee)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between font-bold text-xs text-white border-t border-slate-850 pt-2 mt-1">
                      <span>Total Bayar:</span>
                      <span className="text-emerald-400 text-sm">{formatRupiah(totalAmount)}</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-2 mb-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCheckoutDisabled}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {isLoading ? 'Memproses...' : 'Konfirmasi & Bayar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
