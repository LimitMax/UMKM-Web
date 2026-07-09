import { Order, Product, AIInsight } from '../types';
import { formatRupiah } from '../utils/format';
import { businessService } from './businessService';

export const insightService = {
  generateInsights(orders: Order[], products: Product[]): AIInsight {
    const activeOrders = orders.filter((o) => o.status !== 'Cancelled');
    
    // 1. Identify best-selling product
    const productSalesMap: { [name: string]: { qty: number; category: string } } = {};
    activeOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSalesMap[item.name]) {
          const originalProd = products.find(p => p.name === item.name);
          productSalesMap[item.name] = { qty: 0, category: originalProd?.category || 'Makanan' };
        }
        productSalesMap[item.name].qty += item.quantity;
      });
    });

    let bestSellerName = '';
    let bestSellerQty = 0;
    let bestSellerCategory = '';
    
    Object.entries(productSalesMap).forEach(([name, data]) => {
      if (data.qty > bestSellerQty) {
        bestSellerQty = data.qty;
        bestSellerName = name;
        bestSellerCategory = data.category;
      }
    });

    // 2. Identify slow-selling product
    let slowSellerName = '';
    let slowSellerQty = Infinity;
    
    // Check active products that have been sold at least once or not at all
    products.forEach((prod) => {
      if (prod.isActive) {
        const soldData = productSalesMap[prod.name];
        const qty = soldData ? soldData.qty : 0;
        if (qty < slowSellerQty && prod.name !== bestSellerName) {
          slowSellerQty = qty;
          slowSellerName = prod.name;
        }
      }
    });

    if (slowSellerQty === Infinity) {
      slowSellerName = 'Roti Bakar Cokelat Keju';
      slowSellerQty = 0;
    }

    // 3. Peak Hour Analysis
    const hourMap: { [hour: number]: number } = {};
    activeOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });

    let peakHour = 15; // default 3 PM
    let peakCount = 0;
    Object.entries(hourMap).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = parseInt(hour, 10);
      }
    });

    const formatHourRange = (hour: number) => {
      const start = String(hour).padStart(2, '0') + '.00';
      const end = String((hour + 2) % 24).padStart(2, '0') + '.00';
      return `${start} - ${end}`;
    };

    // 4. Low stock check
    const lowStockProducts = products.filter((p) => p.isActive && p.stock <= 5);
    
    // 5. Build Recommendations
    const recommendations: string[] = [];
    let summary = '';

    if (activeOrders.length === 0) {
      summary = 'Belum ada transaksi hari ini untuk dianalisis. Silakan lakukan transaksi terlebih dahulu pada halaman Order Pelanggan!';
      recommendations.push(
        'Cobalah membuat pesanan demo di Halaman Order untuk mengaktifkan AI Business Insight.',
        'Pastikan stok produk diatur dengan benar agar pelanggan dapat melakukan pemesanan.',
        'Bagikan QR code pemesanan ke meja-meja pelanggan untuk mempermudah pemesanan mandiri.'
      );
      return {
        summary,
        recommendations,
        suggestedPromo: {
          title: 'Promo Pembukaan Toko',
          description: 'Berikan diskon 10% untuk semua produk minuman selama jam makan siang.',
          caption: '📢 PROMO GRAND OPENING! 📢\nNikmati diskon 10% khusus minuman segar favoritmu hanya di UMKM Pilot! Caranya gampang banget, tinggal scan QR di meja dan langsung pesan. Yuk mampir sekarang! ☕️🧁\n#UMKMPilot #PromoKopi #KulinerLokal',
        },
      };
    }

    // Formulate dynamic business insights
    summary = `Performa hari ini cukup baik dengan total ${activeOrders.length} pesanan. Produk paling dicari pelanggan adalah ${bestSellerName} (terjual ${bestSellerQty} unit).`;
    
    if (bestSellerQty > 0) {
      recommendations.push(
        `Optimalkan Stok Terlaris: Permintaan terhadap ${bestSellerName} sedang tinggi. Pastikan pasokan bahan baku aman agar tidak kehilangan potensi omzet.`
      );
      
      if (slowSellerName && slowSellerQty < bestSellerQty) {
        recommendations.push(
          `Strategi Bundling: Pasangkan ${bestSellerName} (sangat laris) dengan ${slowSellerName} (kurang laris) dalam satu paket kombo menarik dengan harga sedikit bersaing untuk menaikkan penjualan ${slowSellerName}.`
        );
      }
    }

    if (lowStockProducts.length > 0) {
      const lowStockNames = lowStockProducts.slice(0, 2).map((p) => p.name).join(', ');
      recommendations.push(
        `Restock Mendesak: Stok produk [${lowStockNames}] berada di bawah batas aman (<= 5 unit). Segera hubungi pemasok hari ini.`
      );
    }

    recommendations.push(
      `Manajemen Jam Sibuk: Transaksi meningkat pada pukul ${formatHourRange(peakHour)}. Siapkan staff ekstra atau persiapan bahan lebih awal sebelum jam tersebut untuk mempercepat pelayanan.`
    );

    const deliveryOrders = activeOrders.filter((o) => o.fulfillmentType === 'delivery');
    if (deliveryOrders.length > 0) {
      recommendations.push(
        "Sebagian pesanan hari ini menggunakan delivery. Pastikan alamat pelanggan dikonfirmasi sebelum pengiriman."
      );
      const profile = businessService.getProfile();
      if (profile.deliverySettings?.freeDeliveryEnabled) {
        recommendations.push(
          "Gratis ongkir aktif. Pantau margin karena biaya pengiriman dapat memengaruhi keuntungan."
        );
      }
    }

    // Suggested Promotion
    const promoTitle = `Paket Hemat ${bestSellerCategory === 'Minuman' ? 'Sore' : 'Kenyang'} Seru`;
    const discountedPrice = Math.round((products.find(p => p.name === bestSellerName)?.price || 15000) * 0.9 + (products.find(p => p.name === slowSellerName)?.price || 15000) * 0.8);
    const originalPrice = (products.find(p => p.name === bestSellerName)?.price || 15000) + (products.find(p => p.name === slowSellerName)?.price || 15000);

    const promoDescription = `Kombinasikan ${bestSellerName} dengan ${slowSellerName} seharga ${formatRupiah(discountedPrice)} (Hemat ${formatRupiah(originalPrice - discountedPrice)}). Cocok dijalankan pada jam sibuk pukul ${formatHourRange(peakHour)}.`;
    
    const promoCaption = `☕️ + 🥪 = KOMBO SEMPURNA!

Bikin sore kamu makin seru dengan "${promoTitle}" dari kami! Dapatkan kombinasi terfavorit:
👉 ${bestSellerName} (Best Seller!)
👉 ${slowSellerName}

Hanya dengan ${formatRupiah(discountedPrice)} aja! (Hemat ${formatRupiah(originalPrice - discountedPrice)} dari harga normal!).

Khusus pembelian langsung lewat scan QR Meja ya! Yuk pesan sekarang sebelum kehabisan! 👇✨
#UMKMPilot #MenuHemat #NgemilSore #KulinerLokal`;

    return {
      summary,
      recommendations,
      suggestedPromo: {
        title: promoTitle,
        description: promoDescription,
        caption: promoCaption,
      },
    };
  },
};
