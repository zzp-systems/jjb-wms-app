import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Package, TrendingUp, AlertTriangle, CheckCircle2, 
  Warehouse, Sparkles, Scale, ShoppingBag, ArrowUpRight, Flame
} from 'lucide-react';
import { 
  SIGNATURE_PRODUCTS_INVENTORY, 
  BISCOCHO_OTAP_7DAY_TREND, 
  SIGNATURE_OUTLET_DISTRIBUTION,
  RAW_MATERIAL_BATCH_POTENTIAL 
} from '../data/signatureProductsData';

export default function SignatureProductsDashboard({ onNavigateToBatching }) {
  const [selectedFocus, setSelectedFocus] = useState('ALL'); // ALL, BISCOCHO, OTAP
  const [displayUnit, setDisplayUnit] = useState('packs'); // packs, pieces

  // Selected or filtered products
  const displayedProducts = useMemo(() => {
    if (selectedFocus === 'BISCOCHO') {
      return SIGNATURE_PRODUCTS_INVENTORY.filter(p => p.sku === 'BIS-001');
    }
    if (selectedFocus === 'OTAP') {
      return SIGNATURE_PRODUCTS_INVENTORY.filter(p => p.sku === 'OTP-001');
    }
    return SIGNATURE_PRODUCTS_INVENTORY;
  }, [selectedFocus]);

  // Specific Biscocho & Otap objects for quick callouts
  const biscocho = SIGNATURE_PRODUCTS_INVENTORY.find(p => p.sku === 'BIS-001');
  const otap = SIGNATURE_PRODUCTS_INVENTORY.find(p => p.sku === 'OTP-001');

  // Chart data formatted
  const chartData = useMemo(() => {
    return displayedProducts.map(p => ({
      name: p.shortName,
      sku: p.sku,
      CurrentStock: displayUnit === 'pieces' ? p.currentStock * p.piecesPerPack : p.currentStock,
      InProduction: displayUnit === 'pieces' ? p.inProduction * p.piecesPerPack : p.inProduction,
      SafetyThreshold: displayUnit === 'pieces' ? p.safetyThreshold * p.piecesPerPack : p.safetyThreshold,
      MaxCapacity: displayUnit === 'pieces' ? p.maxCapacity * p.piecesPerPack : p.maxCapacity,
      unit: displayUnit === 'pieces' ? 'pcs' : p.unit,
      fill: p.color
    }));
  }, [displayedProducts, displayUnit]);

  // Custom Recharts Tooltip
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#240e32] text-white p-3 rounded-xl shadow-xl border border-[#C8963E]/40 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#E5C585] border-b border-white/10 pb-1">
            <Package size={13} />
            <span>{label} ({data.sku})</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <p className="flex justify-between gap-4">
              <span className="text-gray-300">Current Finished Stock:</span>
              <span className="font-mono font-bold text-white">{data.CurrentStock.toLocaleString()} {data.unit}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-300">WIP in Production / Kitting:</span>
              <span className="font-mono font-bold text-[#C8963E]">+{data.InProduction.toLocaleString()} {data.unit}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-300">Minimum Safety Reserve:</span>
              <span className="font-mono font-bold text-red-300">{data.SafetyThreshold.toLocaleString()} {data.unit}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-gray-300">Max Chamber Capacity:</span>
              <span className="font-mono font-bold text-gray-400">{data.MaxCapacity.toLocaleString()} {data.unit}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-[#3D1C52] via-[#4D2368] to-[#5B2E7A] text-white p-5 md:p-6 rounded-2xl border border-[#C8963E]/40 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#C8963E] text-[#240e32] font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                Recharts Analytics Engine
              </span>
              <span className="text-xs text-[#E5C585]">
                Indangan Biscocho &amp; Otap Production Lines
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-white mt-1 flex items-center gap-2">
              <Sparkles size={22} className="text-[#C8963E]" />
              Signature Products Inventory Dashboard
            </h2>
            <p className="text-xs md:text-sm text-gray-300 mt-0.5">
              Visualizing current finished inventory levels, production burn rates, safety thresholds, and raw material readiness for <strong>Biscocho</strong> and <strong>Otap</strong>.
            </p>
          </div>

          {/* Interactive View Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-[#240e32] p-1 rounded-xl border border-[#C8963E]/30 flex text-xs font-semibold">
              <button
                onClick={() => setSelectedFocus('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedFocus === 'ALL' 
                    ? 'bg-[#C8963E] text-[#240e32] font-bold shadow-sm' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                All Signature Products
              </button>
              <button
                onClick={() => setSelectedFocus('BISCOCHO')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedFocus === 'BISCOCHO' 
                    ? 'bg-[#C8963E] text-[#240e32] font-bold shadow-sm' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Biscocho Only
              </button>
              <button
                onClick={() => setSelectedFocus('OTAP')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedFocus === 'OTAP' 
                    ? 'bg-[#C8963E] text-[#240e32] font-bold shadow-sm' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Otap Only
              </button>
            </div>

            <div className="bg-[#240e32] p-1 rounded-xl border border-white/20 flex text-xs">
              <button
                onClick={() => setDisplayUnit('packs')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  displayUnit === 'packs' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Packs
              </button>
              <button
                onClick={() => setDisplayUnit('pieces')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  displayUnit === 'pieces' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Pieces
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Flagship Product Showcase Cards: Biscocho & Otap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BISCOCHO TOASTED BREAD DELICACY CARD */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#C8963E]/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#C8963E]/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C8963E] bg-[#C8963E]/10 px-2 py-0.5 rounded font-mono">
                {biscocho.sku} · FLAGSHIP PASALUBONG
              </span>
              <h3 className="text-xl font-serif font-bold text-[#3D1C52] mt-1">
                {biscocho.name}
              </h3>
              <p className="text-xs text-gray-500">{biscocho.productionFacility}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-[#1E7A3E] border border-green-200 flex items-center gap-1">
              <CheckCircle2 size={13} /> HEALTHY (5.1 DoH)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8]">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Current Finished Stock</p>
              <p className="text-xl font-bold font-mono text-[#3D1C52]">
                {biscocho.currentStock.toLocaleString()} <span className="text-xs font-normal text-gray-600">pk</span>
              </p>
              <p className="text-[10px] text-gray-500">({(biscocho.currentStock * 12).toLocaleString()} pcs)</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Safety Threshold</p>
              <p className="text-xl font-bold font-mono text-gray-700">
                {biscocho.safetyThreshold} <span className="text-xs font-normal text-gray-600">pk</span>
              </p>
              <p className="text-[10px] text-green-600 font-medium">+194% above min</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">In-Pipeline WIP</p>
              <p className="text-xl font-bold font-mono text-[#C8963E]">
                +{biscocho.inProduction} <span className="text-xs font-normal text-gray-600">pk</span>
              </p>
              <p className="text-[10px] text-gray-500">In baking / glazing</p>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>Warehouse Chamber Staging: {biscocho.storageArea}</span>
              <span className="font-bold">{((biscocho.currentStock / biscocho.maxCapacity) * 100).toFixed(0)}% of Max</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-[#C8963E] to-[#E5C585] rounded-full transition-all"
                style={{ width: `${(biscocho.currentStock / biscocho.maxCapacity) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* OTAP LAYERED PUFF PASTRY CARD */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#5B2E7A]/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#5B2E7A]/10 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B2E7A] bg-[#5B2E7A]/10 px-2 py-0.5 rounded font-mono">
                {otap.sku} · LAMINATED SPECIALTY
              </span>
              <h3 className="text-xl font-serif font-bold text-[#3D1C52] mt-1">
                {otap.name}
              </h3>
              <p className="text-xs text-gray-500">{otap.productionFacility}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-[#D68910] border border-amber-200 flex items-center gap-1 animate-pulse">
              <AlertTriangle size={13} /> ATTENTION (2.9 DoH)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8]">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Current Finished Stock</p>
              <p className="text-xl font-bold font-mono text-[#5B2E7A]">
                {otap.currentStock.toLocaleString()} <span className="text-xs font-normal text-gray-600">pk</span>
              </p>
              <p className="text-[10px] text-gray-500">({(otap.currentStock * 10).toLocaleString()} pcs)</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Safety Threshold</p>
              <p className="text-xl font-bold font-mono text-[#C0392B]">
                {otap.safetyThreshold} <span className="text-xs font-normal text-gray-600">pk</span>
              </p>
              <p className="text-[10px] text-amber-600 font-bold">+20 pk to trigger</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">In-Pipeline WIP</p>
              <p className="text-xl font-bold font-mono text-[#5B2E7A]">
                +{otap.inProduction} <span className="text-xs font-normal text-gray-600">pk</span>
              </p>
              <p className="text-[10px] text-gray-500">In laminator / oven</p>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>Warehouse Chamber Staging: {otap.storageArea}</span>
              <span className="font-bold">{((otap.currentStock / otap.maxCapacity) * 100).toFixed(0)}% of Max</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-[#5B2E7A] to-[#8E44AD] rounded-full transition-all"
                style={{ width: `${(otap.currentStock / otap.maxCapacity) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RECHARTS VISUALIZATION 1: Current Inventory vs Safety Threshold & In-Production WIP */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-serif font-bold text-base md:text-lg text-[#3D1C52] flex items-center gap-2">
              <BarChart size={18} className="text-[#C8963E]" />
              Current Finished Goods Inventory vs Safety Reserve
            </h3>
            <p className="text-xs text-gray-500">
              Comparative stock levels against minimum reserve buffer and active production staging.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-600 font-medium">
              <span className="w-3 h-3 rounded bg-[#C8963E]" /> Current Stock
            </span>
            <span className="flex items-center gap-1.5 text-gray-600 font-medium">
              <span className="w-3 h-3 rounded bg-[#5B2E7A]" /> In-Production (WIP)
            </span>
            <span className="flex items-center gap-1.5 text-gray-600 font-medium">
              <span className="w-3 h-1 bg-[#C0392B]" /> Min Safety Threshold
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#3D1C52', fontSize: 12, fontWeight: 600 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Bar 
                dataKey="CurrentStock" 
                name="Current Stock" 
                fill="#C8963E" 
                radius={[6, 6, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
              <Bar 
                dataKey="InProduction" 
                name="In-Production (WIP)" 
                fill="#A569BD" 
                radius={[6, 6, 0, 0]} 
              />
              <Bar 
                dataKey="SafetyThreshold" 
                name="Safety Threshold" 
                fill="#E74C3C" 
                radius={[4, 4, 0, 0]}
                opacity={0.3}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-COLUMN SECTION: 7-Day Trajectory (AreaChart) + Outlet Distribution (PieChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECHARTS VISUALIZATION 2: Biscocho & Otap 7-Day Trend */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1C52] flex items-center gap-2">
                <TrendingUp size={18} className="text-[#5B2E7A]" />
                7-Day Biscocho vs Otap Stock Trajectory
              </h3>
              <p className="text-xs text-gray-500">
                Daily warehouse inventory balance (packs) across the past 7 days.
              </p>
            </div>
            <span className="text-[10px] font-bold bg-[#FAF6EE] text-[#5B2E7A] px-2 py-1 rounded border border-[#E2D1B8]">
              Nov 2026 Run
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={BISCOCHO_OTAP_7DAY_TREND}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBiscocho" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8963E" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#C8963E" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorOtap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B2E7A" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#5B2E7A" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3ece1" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#4B5563', fontSize: 11 }} />
                <YAxis tick={{ fill: '#4B5563', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#240e32', 
                    borderColor: '#C8963E', 
                    borderRadius: '0.75rem', 
                    color: '#fff',
                    fontSize: '11px' 
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area 
                  type="monotone" 
                  dataKey="biscochoStock" 
                  name="Biscocho Stock (Packs)" 
                  stroke="#C8963E" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorBiscocho)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="otapStock" 
                  name="Otap Stock (Packs)" 
                  stroke="#5B2E7A" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorOtap)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECHARTS VISUALIZATION 3: Outlet Distribution Share */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1C52] flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#1E7A3E]" />
                Outlet &amp; Channel Demand Distribution
              </h3>
              <p className="text-xs text-gray-500">
                Share of Biscocho &amp; Otap deliveries by destination outlet.
              </p>
            </div>
            <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
              Weekly Allocation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SIGNATURE_OUTLET_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="totalPacks"
                    nameKey="name"
                  >
                    {SIGNATURE_OUTLET_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} packs`, name]}
                    contentStyle={{ 
                      backgroundColor: '#240e32', 
                      borderColor: '#C8963E', 
                      borderRadius: '0.75rem', 
                      color: '#fff',
                      fontSize: '11px' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs">
              {SIGNATURE_OUTLET_DISTRIBUTION.map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-[#FAF6EE] border border-[#E2D1B8] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-gray-800">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-[#3D1C52]">{item.totalPacks} pk</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RECHARTS VISUALIZATION 4: Raw Material Batch Production Readiness */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-serif font-bold text-base md:text-lg text-[#3D1C52] flex items-center gap-2">
              <Scale size={18} className="text-[#C8963E]" />
              Bodega Raw Material Readiness for Biscocho &amp; Otap Production
            </h3>
            <p className="text-xs text-gray-500">
              Calculates how many master batches can be manufactured immediately from active flour, shortening, sugar, and margarine inventories.
            </p>
          </div>
          {onNavigateToBatching && (
            <button
              onClick={onNavigateToBatching}
              className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <ArrowUpRight size={14} /> Open Romeo's Batching Workbench
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RAW_MATERIAL_BATCH_POTENTIAL.map((pot, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#FAF6EE] border border-[#E2D1B8] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-[#3D1C52]">{pot.product}</h4>
                  <p className="text-xs text-gray-500">Limiting Factor: <span className="font-semibold text-[#C0392B]">{pot.limitingIngredient}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold bg-[#1E7A3E]/10 text-[#1E7A3E] px-2 py-0.5 rounded">
                    Readiness: {pot.readinessScore}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-gray-200 text-center text-xs">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Batches Available</p>
                  <p className="font-bold text-base text-[#5B2E7A]">{pot.batchesPossible} Batches</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Flour Capacity</p>
                  <p className="font-bold text-base text-gray-800">{pot.flourBatchesPossible} Batches</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Finished Yield</p>
                  <p className="font-bold text-base text-[#C8963E]">{pot.maxPotentialPacks.toLocaleString()} pk</p>
                </div>
              </div>

              <div className="text-[11px] text-gray-600 flex justify-between items-center pt-1">
                <span>Hard Flour stock in Dry Room 1: <strong>4,275 kg Rossa</strong></span>
                <span className="text-[#1E7A3E] font-bold">✓ Production Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
