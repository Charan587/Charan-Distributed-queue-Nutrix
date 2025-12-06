import React, { useState, useEffect } from 'react';
import JobForm from './components/JobForm';
import JobDashboard from './components/JobDashboard';
import Stats from './components/Stats';

function App() {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        try {
            const [jobsRes, statsRes] = await Promise.all([
                fetch('http://localhost:8000/jobs'),
                fetch('http://localhost:8000/stats')
            ]);

            if (jobsRes.ok) {
                const data = await jobsRes.json();
                setJobs(data);
            }
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Polling error:", err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-5 font-sans bg-gray-100 min-h-screen">
            {/* Simple Navbar */}
            <nav className="bg-blue-600 text-white p-4 rounded-md shadow-md flex justify-between items-center mb-5">
                <div className="flex items-center">
                    <span className="font-bold text-2xl">TaskFlow</span>
                    <span className="ml-4 text-sm opacity-80 hidden sm:block">Live Updates: {lastUpdated.toLocaleTimeString()}</span>
                </div>
                <span className="text-sm opacity-80 sm:hidden">{lastUpdated.toLocaleTimeString()}</span>
            </nav>

            <main>
                <Stats stats={stats} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Sidebar / Form */}
                    <div className="md:col-span-1">
                        <JobForm onJobCreated={fetchData} />

                        <div className="mt-5 p-4 border border-black rounded">
                            <h3 className="text-lg font-semibold mb-2">System Info</h3>
                            <ul className="list-disc pl-5">
                                <li>Backend: FastAPI</li>
                                <li>Worker: Python</li>
                                <li>Database: SQLite</li>
                            </ul>
                        </div>
                    </div>

                    {/* Main Content / List */}
                    <div className="md:col-span-2">
                        <JobDashboard jobs={jobs} />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
