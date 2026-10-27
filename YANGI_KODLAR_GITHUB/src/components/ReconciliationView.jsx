import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, CheckCircle, Search, AlertCircle, RefreshCw, 
  Layers, Download, Edit2, Trash2, Building, DollarSign, CreditCard, 
  Clock, X, Save, FileText, CheckCheck
} from 'lucide-react';

export default function ReconciliationView() {
  const [deliveries, setDeliveries] = useState([]);
  const [stores, setStores] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterNetwork, setFilterNetwork] = useState('');
  const [filterStoreId, setFilterStoreId] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Partner verification (Sverka)
  const [partnerAmount, setPartnerAmount] = useState('');

  // Tashkilotlar bo'yicha ko'rinish rejimi
  const [showNetworkReport, setShowNetworkReport] = useState(false);

  // Edit Modal State (Tuzatuvchi)
  const [editingItem, setEditingItem] = useState(null);
  const [editKartonKg, setEditKartonKg] = useState('');
  const [editSalafanKg, setEditSalafanKg] = useState('');
  const [editKartonPrice, setEditKartonPrice] = useState('');
  const [editSalafanPrice, setEditSalafanPrice] = useState('');
  const [editTotalPrice, setEditTotalPrice] = useState('');
  const [editPaymentType, setEditPaymentType] = useState('NAQD');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('BAJARILDI');
  const [editNotes, setEditNotes] = useState('');

  // Qarzni To'lash (Naqdga o'tkazish) modallari
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTargetType, setSettleTargetType] = useState('NAQD');
  const [showCloseModal, setShowCloseModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resDel, resStores, resClosures] = await Promise.all([
        fetch('/api/reconciliation'),
        fetch('/api/stores'),
        fetch('/api/month-closures')
      ]);
      const dataDel = await resDel.json();
      const dataStores = await resStores.json();
      const dataClosures = await resClosures.json();

      setDeliveries(Array.isArray(dataDel) ? dataDel : []);
      setStores(Array.isArray(dataStores) ? dataStores : []);
      setClosures(Array.isArray(dataClosures) ? dataClosures : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Standart qilib joriy oyning boshidan oxirigacha qo'yamiz
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditKartonKg(item.karton_kg != null ? item.karton_kg.toString() : '0');
    setEditSalafanKg(item.salafan_kg != null ? item.salafan_kg.toString() : '0');
    setEditKartonPrice(item.karton_price != null ? item.karton_price.toString() : '900');
    setEditSalafanPrice(item.salafan_price != null ? item.salafan_price.toString() : '5700');
    setEditTotalPrice(item.total_price != null ? item.total_price.toString() : '0');
    setEditPaymentType(item.payment_type || 'NAQD');
    setEditDate(item.date || '');
    setEditStatus(item.status || 'BAJARILDI');
    setEditNotes(item.notes || '');
  };

  const handleRecalcTotal = (kKg, sKg, kP, sP) => {
    const k = parseFloat(kKg) || 0;
    const s = parseFloat(sKg) || 0;
    const kp = parseFloat(kP) || 0;
    const sp = parseFloat(sP) || 0;
    setEditTotalPrice(Math.round(k * kp + s * sp).toString());
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch(`/api/deliveries/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          karton_kg: parseFloat(editKartonKg) || 0,
          salafan_kg: parseFloat(editSalafanKg) || 0,
          karton_price: parseFloat(editKartonPrice) || 0,
          salafan_price: parseFloat(editSalafanPrice) || 0,
          total_price: parseFloat(editTotalPrice) || 0,
          payment_type: editPaymentType,
          notes: editNotes,
          date: editDate,
          status: editStatus
        })
      });

      if (res.ok) {
        alert("Reys ma'lumotlari muvaffaqiyatli tuzatildi va saqlandi!");
        setEditingItem(null);
        loadData();
      } else {
        const err = await res.json();
        alert("Xatolik: " + (err.error || 'Saqlanmadi'));
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleDeleteDelivery = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu yozuvni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/deliveries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Yozuv muvaffaqiyatli o'chirildi!");
        setEditingItem(null);
        loadData();
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  // 1 ta qator bo'yicha qarzni tezda Naqdga o'tkazish
  const handleQuickSettleRow = async (deliveryId, targetType = 'NAQD') => {
    if (!window.confirm(`Ushbu do'kon qarzi to'landimi? To'lov turi '${targetType}'ga o'tkaziladi.`)) return;
    try {
      const res = await fetch('/api/deliveries/settle-debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_ids: [deliveryId],
          payment_type: targetType
        })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  // Tanlangan / filtrlangan barcha qarzlarni to'lash (Naqdga o'tkazish)
  const handleSettleFilteredDebts = async (targetType = 'NAQD') => {
    const qarzItems = filtered.filter(d => d.payment_type === 'QARZ');
    if (qarzItems.length === 0) {
      alert("To'lanmagan qarzdorliklar topilmadi!");
      return;
    }
    try {
      const res = await fetch('/api/deliveries/settle-debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_ids: qarzItems.map(d => d.id),
          payment_type: targetType
        })
      });
      if (res.ok) {
        alert(`Barcha qarzdorliklar muvaffaqiyatli ${targetType} to'lovga o'tkazildi! Qarz yopildi.`);
        setShowSettleModal(false);
        loadData();
      } else {
        const err = await res.json();
        alert("Xatolik: " + (err.error || 'Xatolik yuz berdi'));
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  // Muayan bitta tashkilot bo'yicha qarzni to'lash
  const handleSettleSpecificNetwork = async (networkName, targetType = 'NAQD') => {
    const qarzItems = deliveries.filter(d => (d.network_name === networkName || (!d.network_name && networkName === "Mustaqil do'konlar")) && d.payment_type === 'QARZ');
    if (qarzItems.length === 0) {
      alert(`${networkName} bo'yicha to'lanmagan qarz yo'q!`);
      return;
    }
    if (!window.confirm(`${networkName} bo'yicha jami qarz to'landimi? Hammasi ${targetType}ga o'tkaziladi.`)) return;
    try {
      const res = await fetch('/api/deliveries/settle-debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_ids: qarzItems.map(d => d.id),
          payment_type: targetType
        })
      });
      if (res.ok) {
        alert(`${networkName} qarzlari muvaffaqiyatli ${targetType} to'lovga o'tkazildi!`);
        loadData();
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  // Oyni yopish tugmasi bosilganda: Agar qarz bo'lsa modal ochiladi, bo'lmasa to'g'ridan to'g'ri yopiladi
  const handleCloseMonthClick = () => {
    const qarzItems = filtered.filter(d => d.payment_type === 'QARZ');
    if (qarzItems.length > 0) {
      setShowCloseModal(true);
    } else {
      executeCloseMonthOnly();
    }
  };

  // Oyni yopish + Qarzlarni to'lovga o'tkazish
  const handleCloseMonthWithSettlement = async (settleOption) => {
    try {
      if (settleOption === 'NAQD' || settleOption === 'KARTA') {
        const qarzItems = filtered.filter(d => d.payment_type === 'QARZ');
        if (qarzItems.length > 0) {
          await fetch('/api/deliveries/settle-debt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              delivery_ids: qarzItems.map(d => d.id),
              payment_type: settleOption
            })
          });
        }
      }

      const res = await fetch('/api/month-closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          closure_date: new Date().toISOString().split('T')[0],
          closed_by: 'Admin'
        })
      });

      if (res.ok) {
        if (settleOption === 'NAQD' || settleOption === 'KARTA') {
          alert(`Oylik hisobot saqlandi va barcha qarzdorliklar ${settleOption} to'lovga o'tkazildi!`);
        } else {
          alert("Oylik hisobot saqlandi (Qarzlar keyingi oyga o'tdi).");
        }
        setShowCloseModal(false);
        loadData();
      }
    } catch (err) {
      alert("Xatolik yuz berdi: " + err.message);
    }
  };

  const executeCloseMonthOnly = async () => {
    if (!window.confirm("Ushbu oy bo'yicha hisobotni saqlamoqchimisiz?")) return;
    try {
      const res = await fetch('/api/month-closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          closure_date: new Date().toISOString().split('T')[0],
          closed_by: 'Admin'
        })
      });
      if (res.ok) {
        alert("Oylik hisobot muvaffaqiyatli saqlandi!");
        loadData();
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleUndoClosure = async (closureId) => {
    if (!window.confirm("Rostdan ham ushbu oy yopilishini bekor qilmoqchimisiz? Barcha eski oylar hisoboti qayta ochiladi.")) return;
    try {
      const res = await fetch(`/api/month-closures/${closureId}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Oy yopilishi muvaffaqiyatli bekor qilindi!");
        loadData();
      }
    } catch (err) {
      alert("Xatolik yuz berdi: " + err.message);
    }
  };

  const exportToExcel = () => {
    const headers = ['Sana', 'Tarmoq / Tashkilot', 'Do\'kon', 'Holati', 'Karton (kg)', 'Karton Narxi', 'Salafan (kg)', 'Salafan Narxi', 'Jami Summa', 'To\'lov Usuli', 'Izoh'];
    const rows = filtered.map(d => [
      d.date,
      d.network_name || 'Mustaqil',
      d.store_name || '',
      d.status === 'BAJARILDI' ? 'Bajarildi' : (d.status === 'TAYYORMAS' ? 'Otkaz qilingan' : 'Kutilmoqda'),
      d.karton_kg || 0,
      d.karton_price || 0,
      d.salafan_kg || 0,
      d.salafan_price || 0,
      d.total_price || 0,
      d.payment_type || 'NAQD',
      d.notes || ''
    ]);

    let tableHtml = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><meta charset="utf-8"><head><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sverka</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body><table border="1">';
    
    tableHtml += '<tr>';
    headers.forEach(h => { tableHtml += `<th style="background-color: #f3f4f6; font-weight: bold;">${h}</th>`; });
    tableHtml += '</tr>';

    rows.forEach(row => {
      tableHtml += '<tr>';
      row.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
      tableHtml += '</tr>';
    });
    
    tableHtml += `<tr><td colspan="4" style="text-align:right; font-weight:bold;">Jami:</td><td style="font-weight:bold;">${totalKarton}</td><td></td><td style="font-weight:bold;">${totalSalafan}</td><td></td><td style="font-weight:bold;">${totalSum}</td><td></td><td></td></tr>`;

    tableHtml += '</table></body></html>';

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sverka_${startDate}_dan_${endDate}_gacha.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrlangaan ma'lumotlar
  let filtered = deliveries.filter(d => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    if (filterNetwork && d.network_name !== filterNetwork) return false;
    if (filterStoreId && d.store_id.toString() !== filterStoreId) return false;
    if (filterPaymentType && (d.payment_type || 'NAQD') !== filterPaymentType) return false;
    return true;
  });

  const totalKarton = Math.round(filtered.reduce((acc, curr) => acc + (curr.karton_kg || 0), 0) * 10) / 10;
  const totalSalafan = Math.round(filtered.reduce((acc, curr) => acc + (curr.salafan_kg || 0), 0) * 10) / 10;
  const totalSum = filtered.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  // To'lov usullari bo'yicha jami
  const totalNaqd = filtered.filter(d => (d.payment_type || 'NAQD') === 'NAQD').reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const totalKarta = filtered.filter(d => d.payment_type === 'KARTA').reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const totalQarz = filtered.filter(d => d.payment_type === 'QARZ').reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  const partnerDiff = partnerAmount ? parseFloat(partnerAmount) - totalSum : null;

  // Unikal tarmoqlar (networks)
  const networks = [...new Set(stores.map(s => s.network_name).filter(Boolean))];

  // Tashkilotlar (Tarmoqlar) bo'yicha taqsimot
  const networkBreakdown = {};
  filtered.forEach(d => {
    const net = d.network_name || "Mustaqil do'konlar";
    if (!networkBreakdown[net]) {
      networkBreakdown[net] = {
        name: net,
        karton_kg: 0,
        salafan_kg: 0,
        total_sum: 0,
        naqd: 0,
        karta: 0,
        qarz: 0,
        count: 0
      };
    }
    networkBreakdown[net].karton_kg += (d.karton_kg || 0);
    networkBreakdown[net].salafan_kg += (d.salafan_kg || 0);
    networkBreakdown[net].total_sum += (d.total_price || 0);
    if ((d.payment_type || 'NAQD') === 'NAQD') networkBreakdown[net].naqd += (d.total_price || 0);
    else if (d.payment_type === 'KARTA') networkBreakdown[net].karta += (d.total_price || 0);
    else if (d.payment_type === 'QARZ') networkBreakdown[net].qarz += (d.total_price || 0);
    networkBreakdown[net].count++;
  });
  const networkList = Object.values(networkBreakdown);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* 1. SARLAVHA VA TUGMALAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            <span>Sverka va Tashkilotlar Solishtiruvi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Qaysi tashkilotga qancha pul berilgani, qarzlar, naqd/karta to'lovlari va xatoliklarni tuzatish
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowNetworkReport(!showNetworkReport)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm border ${
              showNetworkReport 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>{showNetworkReport ? "Jadvalga Qaytish" : "Tashkilotlar Taqsimoti"}</span>
          </button>

          <button 
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Excel'ga Yuklash</span>
          </button>

          <button 
            onClick={handleCloseMonthClick}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Oylik Hisobotni Saqlash / Belgilash</span>
          </button>
        </div>
      </div>

      {/* 2. OXIRGI MIKRO BANNER */}
      {closures.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-xs block">Oxirgi marta oy yopilgan sana: {closures[0].closure_date}</span>
              <span className="text-[11px] text-amber-700">Hisob-kitoblar saqlanmoqda, umumiy kassa uzluksiz davom etmoqda</span>
            </div>
          </div>
          <button
            onClick={() => handleUndoClosure(closures[0].id)}
            className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition shadow-sm self-start sm:self-auto"
          >
            Yopilishni Bekor Qilish (Tuzatish)
          </button>
        </div>
      )}

      {/* 3. UMUMIY VA TO'LOV BO'YICHA STATISTIKA KARTALARI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Jami Karton</div>
          <div className="text-lg font-black text-amber-600 mt-0.5">{totalKarton} kg</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Jami Salafan</div>
          <div className="text-lg font-black text-blue-600 mt-0.5">{totalSalafan} kg</div>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm text-center text-white">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Jami Berilgan Summa</div>
          <div className="text-lg font-black mt-0.5">{totalSum.toLocaleString()} so'm</div>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center space-x-1">
            <DollarSign className="w-3 h-3" />
            <span>Naqd To'langan</span>
          </div>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{totalNaqd.toLocaleString()} so'm</div>
        </div>

        <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-blue-700 uppercase flex items-center justify-center space-x-1">
            <CreditCard className="w-3 h-3" />
            <span>Karta Orqali</span>
          </div>
          <div className="text-lg font-black text-blue-700 mt-0.5">{totalKarta.toLocaleString()} so'm</div>
        </div>

        <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 shadow-sm text-center flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Qarz (To'lanmagan)</span>
            </div>
            <div className="text-lg font-black text-rose-700 mt-0.5">{totalQarz.toLocaleString()} so'm</div>
          </div>
          {totalQarz > 0 && (
            <button
              onClick={() => {
                setSettleTargetType('NAQD');
                setShowSettleModal(true);
              }}
              className="mt-2 w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black shadow-sm transition flex items-center justify-center space-x-1"
            >
              <DollarSign className="w-3 h-3" />
              <span>Qarzni To'lash (Naqdga)</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. TASHKILOTLAR (TARMOQLAR) BO'YICHA TAQSIMOT BLOKI */}
      {showNetworkReport && (
        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800">
                Tashkilotlar (Tarmoqlar) bo'yicha Umumiy Hisob-Kitob
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Jami {networkList.length} ta tashkilot</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {networkList.map((net, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{net.name}</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                    {net.count} ta reys
                  </span>
                </div>

                <div className="text-xl font-black text-indigo-950">
                  {net.total_sum.toLocaleString()} <span className="text-xs font-normal">so'm</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Karton:</span>
                    <span className="font-bold text-amber-700">{Math.round(net.karton_kg * 10) / 10} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Salafan:</span>
                    <span className="font-bold text-blue-700">{Math.round(net.salafan_kg * 10) / 10} kg</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-emerald-700">
                    <span>💵 Naqd:</span>
                    <span className="font-bold">{net.naqd.toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>💳 Karta:</span>
                    <span className="font-bold">{net.karta.toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>⏳ Qarz:</span>
                    <span className="font-bold">{net.qarz.toLocaleString()} so'm</span>
                  </div>
                </div>

                {net.qarz > 0 && (
                  <button
                    onClick={() => handleSettleSpecificNetwork(net.name, 'NAQD')}
                    className="w-full mt-2 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>Qarzni Naqd To'lash ({net.qarz.toLocaleString()} so'm)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ASOSIY QISM: FILTRLAR + JADVAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* CHAP PANEL: FILTRLAR VA SVERKA KALKULYATORI */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Filtrlar</span>
            </h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Davr (Dan - Gacha)</label>
              <div className="flex space-x-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tashkilot / Tarmoq</label>
              <select value={filterNetwork} onChange={e => { setFilterNetwork(e.target.value); setFilterStoreId(''); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <option value="">-- Barcha Tashkilotlar --</option>
                {networks.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Muayyan Do'kon</label>
              <select value={filterStoreId} onChange={e => setFilterStoreId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <option value="">-- Barcha Do'konlar --</option>
                {stores.filter(s => filterNetwork ? s.network_name === filterNetwork : true).map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.network_name ? `(${s.network_name})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To'lov Usuli</label>
              <select value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <option value="">-- Barcha To'lovlar --</option>
                <option value="NAQD">💵 NAQD</option>
                <option value="KARTA">💳 KARTA</option>
                <option value="QARZ">⏳ QARZ (To'lanmagan)</option>
              </select>
            </div>
          </div>

          {/* SVERKA SOLISHTIRISH KALKULYATORI */}
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-indigo-900 border-b border-indigo-200 pb-2 flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Sverka (Hamkor bilan solishtirish)</span>
            </h3>
            <div>
              <label className="block text-xs font-semibold text-indigo-800 mb-1">Hamkor da'vo qilayotgan summa:</label>
              <input 
                type="number" 
                value={partnerAmount} 
                onChange={e => setPartnerAmount(e.target.value)} 
                placeholder="Summani kiriting..."
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-black text-indigo-900" 
              />
            </div>
            
            {partnerDiff !== null && (
              <div className={`mt-4 p-3 rounded-xl border ${partnerDiff === 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : (partnerDiff > 0 ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-rose-100 border-rose-300 text-rose-800')}`}>
                <div className="text-xs font-bold uppercase mb-1">Farq (Sverka):</div>
                <div className="text-lg font-black">
                  {partnerDiff > 0 ? '+' : ''}{partnerDiff.toLocaleString()} so'm
                </div>
                <div className="text-[10px] mt-1 font-medium">
                  {partnerDiff === 0 ? "Hisob-kitob to'g'ri (0)" : (partnerDiff > 0 ? "Hamkor ko'p so'rayapti" : "Hamkor kam so'rayapti (Biz qarzmiz)")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* O'NG PANEL: JADVAL */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Do'konlar Reyslari va To'lovlar Ro'yxati</h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">Jami {filtered.length} ta yozuv</span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 shadow-sm">
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3 font-bold">Sana</th>
                    <th className="py-3 px-3 font-bold">Do'kon (Tarmoq)</th>
                    <th className="py-3 px-3 font-bold">Holat</th>
                    <th className="py-3 px-3 font-bold">Karton</th>
                    <th className="py-3 px-3 font-bold">Salafan</th>
                    <th className="py-3 px-3 font-bold">Summa</th>
                    <th className="py-3 px-3 font-bold">To'lov Usuli</th>
                    <th className="py-3 px-3 font-bold">Izoh</th>
                    <th className="py-3 px-3 font-bold text-center">Tuzatuvchi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-10 text-center font-medium text-slate-400">
                        Bu davrda hech qanday ma'lumot topilmadi
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-medium text-slate-500 whitespace-nowrap">{d.date}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          <div>{d.store_name}</div>
                          {d.network_name && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] rounded font-extrabold uppercase">
                              {d.network_name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {d.status === 'BAJARILDI' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] rounded-lg font-bold">Bajarildi</span>}
                          {d.status === 'TAYYORMAS' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[11px] rounded-lg font-bold">Otkaz</span>}
                          {d.status === 'KUTILMOQDA' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] rounded-lg font-bold">Kutilmoqda</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {d.karton_kg > 0 ? (
                            <div>
                              <span className="font-bold text-slate-800">{d.karton_kg} kg</span>
                              <span className="text-[10px] text-slate-400 block">x {d.karton_price}</span>
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {d.salafan_kg > 0 ? (
                            <div>
                              <span className="font-bold text-slate-800">{d.salafan_kg} kg</span>
                              <span className="text-[10px] text-slate-400 block">x {d.salafan_price}</span>
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-700 whitespace-nowrap">
                          {d.total_price?.toLocaleString()} so'm
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {(d.payment_type === 'NAQD' || !d.payment_type) && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black">
                              💵 NAQD
                            </span>
                          )}
                          {d.payment_type === 'KARTA' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black">
                              💳 KARTA
                            </span>
                          )}
                          {d.payment_type === 'QARZ' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black">
                              ⏳ QARZ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[140px] truncate" title={d.notes}>
                          {d.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-1">
                          {d.payment_type === 'QARZ' && (
                            <button
                              onClick={() => handleQuickSettleRow(d.id, 'NAQD')}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                              title="Qarz to'landi (Naqdga o'tkazish)"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(d)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                            title="Tuzatish (Edit)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 6. MA'LUMOTLARNI TUZATISH MODAL OYNASI (EDIT MODAL) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {editingItem.store_name}
                </h3>
                <span className="text-xs text-indigo-600 font-bold">
                  {editingItem.network_name || "Mustaqil do'kon"} — Reys hisobotini tuzatish
                </span>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sana:</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Holati:</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="BAJARILDI">Bajarildi</option>
                    <option value="KUTILMOQDA">Kutilmoqda</option>
                    <option value="TAYYORMAS">Otkaz</option>
                  </select>
                </div>
              </div>

              {/* Karton */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">📦 Karton (kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editKartonKg}
                    onChange={e => {
                      setEditKartonKg(e.target.value);
                      handleRecalcTotal(e.target.value, editSalafanKg, editKartonPrice, editSalafanPrice);
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Karton narxi (1 kg):</label>
                  <input
                    type="number"
                    value={editKartonPrice}
                    onChange={e => {
                      setEditKartonPrice(e.target.value);
                      handleRecalcTotal(editKartonKg, editSalafanKg, e.target.value, editSalafanPrice);
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              {/* Salafan */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">🛍️ Salafan (kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editSalafanKg}
                    onChange={e => {
                      setEditSalafanKg(e.target.value);
                      handleRecalcTotal(editKartonKg, e.target.value, editKartonPrice, editSalafanPrice);
                    }}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">Salafan narxi (1 kg):</label>
                  <input
                    type="number"
                    value={editSalafanPrice}
                    onChange={e => {
                      setEditSalafanPrice(e.target.value);
                      handleRecalcTotal(editKartonKg, editSalafanKg, editKartonPrice, e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              {/* Jami Summa va To'lov usuli */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jami To'lov Summasi:</label>
                  <input
                    type="number"
                    value={editTotalPrice}
                    onChange={e => setEditTotalPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">To'lov Usuli:</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['NAQD', 'KARTA', 'QARZ'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditPaymentType(t)}
                        className={`py-1.5 text-[11px] font-black rounded-lg border transition ${
                          editPaymentType === t 
                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izoh / Qayd:</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Xarid haqida qo'shimcha izoh..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={() => handleDeleteDelivery(editingItem.id)}
                  className="flex items-center space-x-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>O'chirish</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Saqlash</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. QARZNI TO'LASH MODAL OYNASI (SETTLE MODAL) */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-800">
                  Qarzni To'lash (Naqd / Kartaga O'tkazish)
                </h3>
              </div>
              <button onClick={() => setShowSettleModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <span className="text-xs text-rose-600 font-bold block">Tanlangan qarzdorlik summasi:</span>
              <span className="text-2xl font-black text-rose-700">{totalQarz.toLocaleString()} so'm</span>
              <p className="text-[11px] text-slate-500 mt-1">
                {filterNetwork ? `${filterNetwork} tashkiloti bo'yicha` : "Barcha filtrlangan do'konlar bo'yicha"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Pul qanday to'landi?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleTargetType('NAQD')}
                  className={`py-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                    settleTargetType === 'NAQD' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>💵 NAQD Pul Berildi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettleTargetType('KARTA')}
                  className={`py-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                    settleTargetType === 'KARTA' 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>💳 KARTA / Perevod</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => handleSettleFilteredDebts(settleTargetType)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>To'lovni Tasdiqlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. OYNI YOPISH VA QARZLARNI NAQDGA O'TKAZISH MODALI */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-800">
                  Oylik Hisobotni Saqlash & Qarzlarni Yopish
                </h3>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Ushbu oy bo'yicha to'lanmagan qarz mavjud:</span>
                <span className="text-base font-black text-rose-700">{totalQarz.toLocaleString()} so'm</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Oy yopilayotganda tashkilotlar (do'konlar) bilan hisob-kitob qilinib, pul to'landimi?
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleCloseMonthWithSettlement('NAQD')}
                className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 text-left">
                  <DollarSign className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="block text-sm">💵 Ha, Pul Naqd To'landi va Oyni Yopish</span>
                    <span className="text-[10px] font-normal text-emerald-100">Barcha {totalQarz.toLocaleString()} so'm qarz NAQD to'lovga o'tkaziladi</span>
                  </div>
                </div>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => handleCloseMonthWithSettlement('KARTA')}
                className="w-full p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 text-left">
                  <CreditCard className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="block text-sm">💳 Ha, Karta Orqali To'landi va Oyni Yopish</span>
                    <span className="text-[10px] font-normal text-blue-100">Barcha {totalQarz.toLocaleString()} so'm qarz KARTA to'loviga o'tkaziladi</span>
                  </div>
                </div>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={() => handleCloseMonthWithSettlement('LEAVE_DEBT')}
                className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-between border border-slate-200"
              >
                <div className="flex items-center space-x-2 text-left">
                  <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <span className="block">⏳ Yo'q, Qarzligicha Qoldirish va Oyni Yopish</span>
                    <span className="text-[10px] text-slate-500 font-normal">Qarzlar keyingi oyga qarz sifatida o'tadi</span>
                  </div>
                </div>
                <span>→</span>
              </button>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
