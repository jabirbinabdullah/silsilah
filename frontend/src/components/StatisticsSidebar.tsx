import React, { useState, useMemo, useCallback } from 'react';
import { TreeStatistics, exportStatisticsAsCSV, downloadStatisticsCSV } from '../utils/statisticsCalculator';

interface StatisticsSidebarProps {
  statistics: TreeStatistics | null;
  treeName: string;
  isLoading?: boolean;
}

const StatisticsSidebar: React.FC<StatisticsSidebarProps> = ({ statistics, treeName, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'gender' | 'lifespan' | 'timeline'>('overview');

  const handleExportCSV = useCallback(() => {
    if (!statistics) return;
    const csv = exportStatisticsAsCSV(statistics, treeName);
    const fileName = `${treeName.replace(/\s+/g, '_')}_statistics_${new Date().getTime()}.csv`;
    downloadStatisticsCSV(csv, fileName);
  }, [statistics, treeName]);

  if (isLoading) {
    return (
      <div className="card h-100">
        <div className="card-body d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading statistics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="card h-100">
        <div className="card-body">
          <h5 className="card-title">Statistics</h5>
          <p className="text-muted">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-100 d-flex flex-column">
      <div className="card-header bg-light border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">📊 Statistics</h5>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleExportCSV}
            title="Export statistics as CSV"
          >
            ⬇️ CSV
          </button>
        </div>
      </div>

      <div className="card-body overflow-y-auto flex-grow-1">
        {/* Tab Navigation */}
        <ul className="nav nav-tabs nav-fill mb-3" style={{ fontSize: '0.85rem' }}>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'relationships' ? 'active' : ''}`}
              onClick={() => setActiveTab('relationships')}
            >
              Relations
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'gender' ? 'active' : ''}`}
              onClick={() => setActiveTab('gender')}
            >
              Gender
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'lifespan' ? 'active' : ''}`}
              onClick={() => setActiveTab('lifespan')}
            >
              Lifespan
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab stats={statistics} />}
        {activeTab === 'relationships' && <RelationshipsTab stats={statistics} />}
        {activeTab === 'gender' && <GenderTab stats={statistics} />}
        {activeTab === 'lifespan' && <LifespanTab stats={statistics} />}
        {activeTab === 'timeline' && <TimelineTab stats={statistics} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ stats: TreeStatistics }> = ({ stats }) => (
  <div>
    <div className="mb-3">
      <div className="row">
        <div className="col-6 mb-2">
          <small className="text-muted">Total People</small>
          <h6 className="text-primary mb-0">{stats.basicStats.totalPeople}</h6>
        </div>
        <div className="col-6 mb-2">
          <small className="text-muted">Generations</small>
          <h6 className="text-success mb-0">{stats.basicStats.totalGenerations}</h6>
        </div>
      </div>
    </div>

    {stats.basicStats.averageAge && (
      <div className="mb-3">
        <small className="text-muted">Average Age</small>
        <h6 className="text-info mb-0">{stats.basicStats.averageAge} years</h6>
      </div>
    )}

    {stats.basicStats.oldestPerson && (
      <div className="mb-3 p-2 bg-light rounded">
        <small className="text-muted">Oldest Person</small>
        <div className="small font-weight-bold">{stats.basicStats.oldestPerson.name}</div>
        {stats.basicStats.oldestPerson.age && <small className="text-muted">Age: {stats.basicStats.oldestPerson.age}</small>}
      </div>
    )}

    {stats.basicStats.youngestPerson && (
      <div className="mb-3 p-2 bg-light rounded">
        <small className="text-muted">Youngest Person</small>
        <div className="small font-weight-bold">{stats.basicStats.youngestPerson.name}</div>
        {stats.basicStats.youngestPerson.age && <small className="text-muted">Age: {stats.basicStats.youngestPerson.age}</small>}
      </div>
    )}
  </div>
);

// Relationships Tab Component
const RelationshipsTab: React.FC<{ stats: TreeStatistics }> = ({ stats }) => (
  <div>
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted">Spouse Relationships</small>
        <span className="badge bg-primary">{stats.relationshipStats.spouseRelationships}</span>
      </div>
      <div className="progress" style={{ height: '6px' }}>
        <div
          className="progress-bar bg-primary"
          style={{
            width: `${
              (stats.relationshipStats.spouseRelationships / stats.relationshipStats.totalRelationships) * 100
            }%`,
          }}
        ></div>
      </div>
    </div>

    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted">Parent-Child Relationships</small>
        <span className="badge bg-success">{stats.relationshipStats.parentChildRelationships}</span>
      </div>
      <div className="progress" style={{ height: '6px' }}>
        <div
          className="progress-bar bg-success"
          style={{
            width: `${
              (stats.relationshipStats.parentChildRelationships / stats.relationshipStats.totalRelationships) * 100
            }%`,
          }}
        ></div>
      </div>
    </div>

    <div className="mb-3 p-2 bg-light rounded">
      <small className="text-muted">Total Relationships</small>
      <h6 className="text-dark mb-0">{stats.relationshipStats.totalRelationships}</h6>
    </div>

    <div className="small text-muted mt-2">
      <div>👥 Ratio: {stats.relationshipStats.spouseRelationships}:{stats.relationshipStats.parentChildRelationships}</div>
    </div>
  </div>
);

// Gender Tab Component with Pie Chart
const GenderTab: React.FC<{ stats: TreeStatistics }> = ({ stats }) => {
  const genderData = [
    { label: 'Male', value: stats.genderStats.male, color: '#007bff' },
    { label: 'Female', value: stats.genderStats.female, color: '#e83e8c' },
    { label: 'Unknown', value: stats.genderStats.unknown, color: '#6c757d' },
  ];

  const total = genderData.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div>
      <PieChart data={genderData} total={total} />

      <div className="mt-3">
        {genderData.map(item => (
          <div key={item.label} className="mb-2 d-flex align-items-center">
            <div
              className="rounded-circle me-2"
              style={{ width: '12px', height: '12px', backgroundColor: item.color }}
            ></div>
            <small className="flex-grow-1">{item.label}</small>
            <span className="badge bg-light text-dark">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="small text-muted mt-2">
        {Math.round((stats.genderStats.male / total) * 100)}% Male • {Math.round((stats.genderStats.female / total) * 100)}% Female
      </div>
    </div>
  );
};

// Lifespan Tab Component
const LifespanTab: React.FC<{ stats: TreeStatistics }> = ({ stats }) => (
  <div>
    <div className="mb-3">
      <small className="text-muted">People with Birth Date</small>
      <h6 className="text-primary mb-0">{stats.lifespanStats.peopleWithBirthDate}</h6>
    </div>

    <div className="mb-3">
      <small className="text-muted">People with Death Date</small>
      <h6 className="text-danger mb-0">{stats.lifespanStats.peopleWithDeathDate}</h6>
    </div>

    {stats.lifespanStats.averageLifespan && (
      <div className="mb-3 p-2 bg-light rounded">
        <small className="text-muted">Average Lifespan</small>
        <h6 className="text-info mb-0">{stats.lifespanStats.averageLifespan} years</h6>
      </div>
    )}

    {stats.lifespanStats.birthYearRange && (
      <div className="mb-3">
        <small className="text-muted d-block">Birth Year Range</small>
        <small className="text-dark">
          {stats.lifespanStats.birthYearRange.min} - {stats.lifespanStats.birthYearRange.max}
        </small>
      </div>
    )}

    {stats.lifespanStats.deathYearRange && (
      <div className="mb-3">
        <small className="text-muted d-block">Death Year Range</small>
        <small className="text-dark">
          {stats.lifespanStats.deathYearRange.min} - {stats.lifespanStats.deathYearRange.max}
        </small>
      </div>
    )}

    {stats.lifespanStats.averageBirthYear && (
      <div className="mb-3">
        <small className="text-muted d-block">Average Birth Year</small>
        <small className="text-dark">{stats.lifespanStats.averageBirthYear}</small>
      </div>
    )}

    {stats.lifespanStats.averageDeathYear && (
      <div className="mb-3">
        <small className="text-muted d-block">Average Death Year</small>
        <small className="text-dark">{stats.lifespanStats.averageDeathYear}</small>
      </div>
    )}
  </div>
);

// Timeline Tab Component
const TimelineTab: React.FC<{ stats: TreeStatistics }> = ({ stats }) => (
  <div>
    {stats.timelineEvents.length === 0 ? (
      <p className="text-muted small">No timeline events available</p>
    ) : (
      <div className="timeline-events" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {stats.timelineEvents.slice(0, 20).map((event, index) => (
          <div key={index} className="mb-2 pb-2 border-bottom small">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>{event.year}</strong>
                <span className={`badge ms-2 ${event.type === 'birth' ? 'bg-info' : 'bg-danger'}`}>
                  {event.type === 'birth' ? '👶' : '⚰️'}
                </span>
              </div>
              <span className="badge bg-secondary">{event.count}</span>
            </div>
            <small className="text-muted">{event.description}</small>
          </div>
        ))}
        {stats.timelineEvents.length > 20 && (
          <small className="text-muted">... and {stats.timelineEvents.length - 20} more events</small>
        )}
      </div>
    )}
  </div>
);

// Pie Chart Component
interface PieChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  total: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, total }) => {
  const size = 120;
  const radius = 40;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -Math.PI / 2;
  const slices = data.map(item => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const path = [
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
      'Z',
    ].join(' ');

    currentAngle = endAngle;

    return { ...item, path };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto d-block mb-3">
      {slices.map((slice, index) => (
        <path key={index} d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />
      ))}
    </svg>
  );
};

export default StatisticsSidebar;
