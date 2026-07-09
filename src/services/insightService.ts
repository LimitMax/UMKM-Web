import { Order, Product, AIInsight, PromoRecommendation } from '../types';
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
      
      const fallbackPromos = [
        {
          id: 'promo-1',
          title: 'Promo Pembukaan Toko',
          reason: 'Menarik perhatian pelanggan awal pada fase grand opening.',
          mainProductName: 'Semua Minuman',
          bundleProductName: 'Tidak Ada',
          suggestedPromoName: 'Grand Opening Bebas Haus',
          suggestedDiscountAmount: 1800,
          suggestedPrice: 16200,
          normalPrice: 18000,
          estimatedSavings: 1800,
          targetTime: '12.00 - 14.00',
          targetCustomer: 'Karyawan kantor & pelajar sekitar',
          campaignGoal: 'Meningkatkan awareness brand & kunjungan outlet pertama kali.',
          whatsappCaption: '*📢 PROMO GRAND OPENING! 📢*\n\nNikmati diskon 10% khusus minuman segar favoritmu hanya di UMKM Pilot! Caranya gampang banget, tinggal scan QR di meja dan langsung pesan. Yuk mampir sekarang! ☕️🧁',
          instagramCaption: '📢 PROMO GRAND OPENING! 📢\nNikmati diskon 10% khusus minuman segar favoritmu hanya di UMKM Pilot! Caranya gampang banget, tinggal scan QR di meja dan langsung pesan. Yuk mampir sekarang! ☕️🧁\n#UMKMPilot #PromoKopi #KulinerLokal #GrandOpening',
          shortCaption: 'Diskon 10% untuk semua minuman segar favorit!',
          confidenceScore: 85,
          basedOnSignals: ['Inisialisasi bisnis baru', 'Jam makan siang potensial']
        },
        {
          id: 'promo-2',
          title: 'Paket Sarapan Kombo',
          reason: 'Meningkatkan omzet pagi hari dengan kombinasi produk pelengkap.',
          mainProductName: 'Es Kopi Susu Gula Aren',
          bundleProductName: 'Roti Bakar Cokelat Keju',
          suggestedPromoName: 'Kombo Sarapan Ceria',
          suggestedDiscountAmount: 5000,
          suggestedPrice: 27000,
          normalPrice: 32000,
          estimatedSavings: 5000,
          targetTime: '08.00 - 10.00',
          targetCustomer: 'Komuter pagi & pekerja kantoran',
          campaignGoal: 'Mendorong pembelian kombo makanan + minuman di pagi hari.',
          whatsappCaption: '*☕️ Kombo Sarapan Ceria! 🍞*\n\nDapatkan Es Kopi Susu Gula Aren + Roti Bakar Cokelat Keju hanya *Rp 27.000* (Hemat Rp 5.000). Pesan praktis lewat HP!',
          instagramCaption: '☕️ + 🍞 = PAGI YANG SEMPURNA!\n\nAwali harimu dengan Kombo Sarapan Ceria! Dapatkan Kopi Aren terfavorit dan Roti Bakar Cokelat Keju hangat hanya Rp 27.000 (Hemat Rp 5.000 dari harga normal!). 🥰\n#UMKMPilot #PromoSarapan #KopiDanRoti',
          shortCaption: 'Kopi Aren + Roti Bakar Cokelat Keju hemat Rp 5.000!',
          confidenceScore: 80,
          basedOnSignals: ['Sinergi menu sarapan', 'Stok roti melimpah']
        }
      ];

      return {
        summary,
        recommendations,
        suggestedPromo: {
          title: fallbackPromos[0].title,
          description: 'Berikan diskon 10% untuk semua produk minuman selama jam makan siang.',
          caption: fallbackPromos[0].instagramCaption,
        },
        promoRecommendations: fallbackPromos
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
      if (deliveryOrders.length >= 2) {
        recommendations.push(
          "Pesanan delivery cukup aktif. Evaluasi biaya ongkir per KM agar margin tetap aman."
        );
      } else {
        recommendations.push(
          "Sebagian pesanan hari ini menggunakan delivery. Pastikan alamat pelanggan dikonfirmasi sebelum pengiriman."
        );
      }
      const profile = businessService.getProfileSync();
      const freeDeliveryCount = deliveryOrders.filter((o) => o.freeDeliveryApplied).length;
      if (freeDeliveryCount > 0 || profile.deliverySettings?.freeDeliveryEnabled) {
        recommendations.push(
          "Gratis ongkir banyak digunakan. Pastikan minimum belanja sudah menutup biaya operasional pengiriman."
        );
      }
    }

    // Phase 6.8 — ETA insights
    const etaProfile = businessService.getProfileSync();
    if (etaProfile.etaSettings?.etaEnabled) {
      const ordersWithEta = activeOrders.filter((o) => o.estimatedTotalMinutes !== undefined);
      const avgTotal = ordersWithEta.length > 0
        ? ordersWithEta.reduce((sum, o) => sum + (o.estimatedTotalMinutes ?? 0), 0) / ordersWithEta.length
        : 0;
      if (avgTotal > 35) {
        recommendations.push(
          `Rata-rata ETA pesanan hari ini adalah ${Math.round(avgTotal)} menit — lebih lama dari ideal. Pertimbangkan mengurangi buffer jam sibuk atau menambah kapasitas dapur.`
        );
      }
      const deliveryWithEta = ordersWithEta.filter((o) => o.fulfillmentType === 'delivery');
      if (deliveryWithEta.length > 0) {
        const avgDelivery = deliveryWithEta.reduce((sum, o) => sum + (o.estimatedTotalMinutes ?? 0), 0) / deliveryWithEta.length;
        if (avgDelivery > 40) {
          recommendations.push(
            `Rata-rata ETA delivery mencapai ${Math.round(avgDelivery)} menit. Pertimbangkan membatasi radius pengiriman atau menambah mitra kurir untuk area yang jauh.`
          );
        }
      }
      const manuallyAdjusted = ordersWithEta.filter((o) => o.etaManuallyAdjusted).length;
      if (manuallyAdjusted > 0) {
        recommendations.push(
          `${manuallyAdjusted} pesanan ETA-nya sudah disesuaikan kasir secara manual. Jika terjadi berulang, pertimbangkan menaikkan waktu persiapan default di Pengaturan ETA.`
        );
      }
    }

    // Define items for structured dynamic recommendations
    const mainProduct = products.find(p => p.name === bestSellerName) || products[0];
    const bundleProduct = products.find(p => p.name === slowSellerName) || products[1];
    
    const mainProductPrice = mainProduct?.price || 15000;
    const bundleProductPrice = bundleProduct?.price || 15000;

    // Promotion 1: Bundle Combo
    const p1NormalPrice = mainProductPrice + bundleProductPrice;
    const p1Discount = Math.round(p1NormalPrice * 0.15); // 15% off
    const p1PromoPrice = p1NormalPrice - p1Discount;
    const p1Title = `Paket Hemat ${bestSellerCategory === 'Minuman' ? 'Sore' : 'Kenyang'} Seru`;
    const p1PromoName = `Kombo ${mainProduct.name.substring(0, 15)} + ${bundleProduct.name.substring(0, 15)}`;
    
    const p1Desc = `Kombinasikan ${bestSellerName} dengan ${slowSellerName} seharga ${formatRupiah(p1PromoPrice)} (Hemat ${formatRupiah(p1Discount)}). Cocok dijalankan pada jam sibuk pukul ${formatHourRange(peakHour)}.`;
    
    const p1WA = `*Promo Kombo Hemat!* 🔥\n\nNikmati perpaduan lezat *${bestSellerName}* dan *${slowSellerName}* dengan harga khusus hanya *${formatRupiah(p1PromoPrice)}* (Hemat *${formatRupiah(p1Discount)}* dari harga normal!).\n\nPesan sekarang dengan scan QR menu meja Anda! 📲`;
    
    const p1IG = `☕️ + 🥪 = KOMBO SEMPURNA!\n\nBikin harimu makin ceru dengan Paket "${p1Title}" dari kami! Dapatkan kombinasi terfavorit:\n👉 *${bestSellerName}* (Best Seller!)\n👉 *${slowSellerName}*\n\nHanya dengan *${formatRupiah(p1PromoPrice)}* saja! (Hemat *${formatRupiah(p1Discount)}* dari harga normal!).\n\nYuk buruan pesan lewat scan QR Meja di outlet terdekat! ✨\n#UMKMPilot #MenuHemat #NgemilSore #PromoKombo`;

    // Promotion 2: Happy Hour
    const p2Discount = Math.round(mainProductPrice * 0.10); // 10% off
    const p2PromoPrice = mainProductPrice - p2Discount;
    const p2PromoName = `Flash Sale Happy Hour ${formatHourRange(peakHour).replace(' - ', '-')}`;
    
    const p2WA = `*Happy Hour Flash Sale!* ⚡\n\nKhusus jam *${formatHourRange(peakHour)}*, nikmati diskon khusus untuk *${bestSellerName}* seharga *${formatRupiah(p2PromoPrice)}* (Hemat *${formatRupiah(p2Discount)}*).\n\nPesan langsung via QR menu meja Anda!`;
    
    const p2IG = `⚡ FLASH SALE HAPPY HOUR IS BACK! ⚡\n\nDapatkan diskon spesial 10% untuk produk terlaris kami *${bestSellerName}* khusus pembelian pada jam sibuk *${formatHourRange(peakHour)}*!\n\nHarga promo hanya *${formatRupiah(p2PromoPrice)}*! Yuk pasang alarm dan jangan sampai kelewatan promonya ya! ⏰\n#UMKMPilot #HappyHour #DiskonKilat #KulinerAsik`;

    // Promotion 3: Delivery Booster
    const p3Discount = 6000;
    const p3PromoName = `Bebas Ongkir Delivery`;
    
    const p3WA = `*Subsidi Ongkir Delivery!* 🛵\n\nMager keluar rumah? Nikmati subsidi ongkir s.d *Rp 6.000* untuk pemesanan delivery dengan minimal belanja *Rp 25.000*!\n\nPesan sekarang di web menu order kami!`;
    
    const p3IG = `🛵 MAGER KELUAR? KAMI ANTAR BEBAS ONGKIR! 🛵\n\nNikmati kemudahan pesan kuliner favoritmu langsung dari rumah dengan promo Bebas Ongkir dari kami! Minimal belanja hanya Rp 25.000 saja lho!\n\nYuk pesan sekarang lewat link bio kami! 📲\n#UMKMPilot #FreeOngkir #DeliveryService #KulinerPraktis`;

    const promoRecommendations: PromoRecommendation[] = [
      {
        id: 'promo-bundle',
        title: p1Title,
        reason: `Mengawinkan produk terlaris (${bestSellerName}) dengan produk slow-moving (${slowSellerName}) untuk mempercepat perputaran inventaris.`,
        mainProductName: bestSellerName,
        bundleProductName: slowSellerName,
        suggestedPromoName: p1PromoName,
        suggestedDiscountAmount: p1Discount,
        suggestedPrice: p1PromoPrice,
        normalPrice: p1NormalPrice,
        estimatedSavings: p1Discount,
        targetTime: formatHourRange(peakHour),
        targetCustomer: 'Pecinta kombo hemat & pemburu diskon',
        campaignGoal: 'Meningkatkan penjualan produk slow-moving & menaikkan nilai rata-rata keranjang (AOV).',
        whatsappCaption: p1WA,
        instagramCaption: p1IG,
        shortCaption: `Nikmati paket hemat ${bestSellerName} + ${slowSellerName} seharga ${formatRupiah(p1PromoPrice)}!`,
        confidenceScore: 92,
        basedOnSignals: [`Tinggi penjualan: ${bestSellerName} (${bestSellerQty} unit)`, `Stok melimpah: ${slowSellerName}`, `Jam sibuk teridentifikasi: ${formatHourRange(peakHour)}`]
      },
      {
        id: 'promo-happy-hour',
        title: 'Happy Hour Flash Sale',
        reason: `Memaksimalkan transaksi produk terpopuler pada jam sibuk ${formatHourRange(peakHour)} untuk mendorong impulsiveness pembeli.`,
        mainProductName: bestSellerName,
        bundleProductName: 'Semua Minuman',
        suggestedPromoName: p2PromoName,
        suggestedDiscountAmount: p2Discount,
        suggestedPrice: p2PromoPrice,
        normalPrice: mainProductPrice,
        estimatedSavings: p2Discount,
        targetTime: formatHourRange(peakHour),
        targetCustomer: 'Pekerja kantor, pelajar, dan mahasiswa saat istirahat/pulang',
        campaignGoal: 'Menciptakan urgensi transaksi pada puncak jam sibuk.',
        whatsappCaption: p2WA,
        instagramCaption: p2IG,
        shortCaption: `Diskon 10% untuk ${bestSellerName} khusus pukul ${formatHourRange(peakHour)}!`,
        confidenceScore: 87,
        basedOnSignals: [`Jam kunjungan puncak: pukul ${formatHourRange(peakHour)}`, `Produk paling disukai: ${bestSellerName}`]
      },
      {
        id: 'promo-delivery',
        title: 'Delivery Booster Campaign',
        reason: 'Menstimulasi volume transaksi dari segmen pelanggan online/WFH dengan subsidi biaya pengiriman.',
        mainProductName: 'Semua Menu',
        bundleProductName: 'Fulfillment Delivery',
        suggestedPromoName: p3PromoName,
        suggestedDiscountAmount: p3Discount,
        suggestedPrice: 19000,
        normalPrice: 25000,
        estimatedSavings: p3Discount,
        targetTime: 'Sepanjang Hari',
        targetCustomer: 'Pelanggan online / WFH / Residen perumahan',
        campaignGoal: 'Meningkatkan volume pesanan delivery & memperluas jangkauan pasar.',
        whatsappCaption: p3WA,
        instagramCaption: p3IG,
        shortCaption: `Subsidi ongkir Rp 6.000 untuk delivery dengan min. belanja Rp 25.000!`,
        confidenceScore: 79,
        basedOnSignals: ['Aktivitas pesanan delivery terdeteksi', 'Preferensi pengantaran jarak jauh']
      }
    ];

    return {
      summary,
      recommendations,
      suggestedPromo: {
        title: p1Title,
        description: p1Desc,
        caption: p1IG,
      },
      promoRecommendations
    };
  },
};
