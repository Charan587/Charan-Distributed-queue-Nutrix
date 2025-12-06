import React from 'react';

const Stats = ({ stats }) => {
    if (!stats) return null;

    const cards = [
        { label: 'Total Jobs', value: stats.total },
        { label: 'Pending', value: stats.pending },
        { label: 'Processing', value: stats.processing },
        { label: 'Completed', value: stats.completed },
        { label: 'Failed', value: stats.failed },
        { label: 'Dead Letter', value: stats.dead_letter },
    ];

    return (
        <div className="flex flex-wrap gap-4 mb-5 justify-center">
            {cards.map((card) => (
                <div key={card.label} className="border border-blue-200 bg-blue-50 p-4 rounded-lg shadow-md min-w-[120px] text-center flex-1 sm:flex-none transform hover:scale-105 transition-all duration-300 ease-in-out">
                    <div className="text-4xl font-extrabold text-blue-700 mb-1 leading-tight">{card.value}</div>
                    <div className="text-sm font-medium text-blue-600 uppercase tracking-wider">{card.label}</div>
                </div>
            ))}
        </div>
    );
};

export default Stats;
