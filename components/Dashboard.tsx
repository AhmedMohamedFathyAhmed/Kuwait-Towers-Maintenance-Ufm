import React from 'react';
import { MaintenanceRecord, Category, Status } from '../types';
import { PieChart, BarChart, CheckCircle2, Clock, AlertTriangle, Building, Activity } from 'lucide-react';

interface DashboardProps {
  records: MaintenanceRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ records }) => {
  // 1. Calculate Totals
  const total = records.length;
  const done = records.filter(r => r.status === Status.DONE).length;
  const pending = records.filter(r => r.status === Status.PENDING || r.status === Status.WAITING_FOR_PARTS).length;
  const inProgress = records.filter(r => r.status === Status.IN_PROGRESS).length;
  
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

  // 2. Group by Category
  const catStats = Object.values(Category).map(cat => {
    const count = records.filter(r => r.category === cat).length;
    return { name: cat, count, percent: total === 0 ? 0 : (count / total) * 100 };
  }).sort((a, b) => b.count - a.count);

  // 3. Group by Building
  const buildingStats = records.reduce((acc, curr) => {
    acc[curr.building] = (acc[curr.building] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedBuildings = Object.entries(buildingStats)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([name, count]) => ({ name, count: count as number, percent: total === 0 ? 0 : ((count as number) / total) * 100 }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Tasks</p>
            <h3 className="text-2xl font-bold text-gray-800">{total}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Completed</p>
            <h3 className="text-2xl font-bold text-gray-800">{done} <span className="text-xs text-green-500 font-medium">({completionRate}%)</span></h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">In Progress</p>
            <h3 className="text-2xl font-bold text-gray-800">{inProgress}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Pending / Waiting</p>
            <h3 className="text-2xl font-bold text-gray-800">{pending}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="text-indigo-600" size={20} />
            <h3 className="font-bold text-gray-700">Faults by System (Category)</h3>
          </div>
          <div className="space-y-4">
            {catStats.map(cat => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-600">{cat.name}</span>
                  <span className="font-bold text-gray-800">{cat.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${cat.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Building Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <Building className="text-teal-600" size={20} />
            <h3 className="font-bold text-gray-700">Faults by Tower</h3>
          </div>
          <div className="space-y-4">
            {sortedBuildings.length > 0 ? sortedBuildings.map(b => (
              <div key={b.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-600">{b.name}</span>
                  <span className="font-bold text-gray-800">{b.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div 
                    className="bg-teal-500 h-2.5 rounded-full transition-all duration-1000" 
                    style={{ width: `${b.percent}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400 italic">No data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;