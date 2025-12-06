import React, { useState } from 'react';

const JobForm = ({ onJobCreated }) => {
    const [type, setType] = useState('email_report');
    const [payload, setPayload] = useState('{"target": "user@example.com"}');
    const [tenantId, setTenantId] = useState('user_123');
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:8000/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId
                },
                body: JSON.stringify({
                    type,
                    payload: JSON.parse(payload),
                    tenant_id: tenantId,
                    idempotency_key: Date.now().toString()
                })
            });

            if (res.ok) {
                onJobCreated();
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to create job');
            }
        } catch (err) {
            console.error(err);
            setError('Network error or invalid JSON');
        }
        setLoading(false);
    };

    return (
        <div className="border border-gray-300 p-5 mb-5 rounded-lg shadow-sm bg-white">
            <h3 className="text-2xl font-bold mb-4 text-blue-700">New Job</h3>

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2">Tenant ID</label>
                    <input
                        className="shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
                        value={tenantId}
                        onChange={e => setTenantId(e.target.value)}
                        placeholder="e.g. user_123"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2">Job Type</label>
                    <select
                        className="shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
                        value={type}
                        onChange={e => setType(e.target.value)}
                    >
                        <option value="email_report">Email Report</option>
                        <option value="data_processing">Data Processing</option>
                        <option value="image_resize">Image Resize</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2">Payload (JSON)</label>
                    <textarea
                        className="shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 h-32 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out resize-none"
                        value={payload}
                        onChange={e => setPayload(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Submitting...' : 'Submit Job'}
                </button>
            </form>

            <div className="mt-5 p-4 border border-gray-300 rounded-lg shadow-sm bg-white">
                <h3 className="text-lg font-semibold mb-2 text-blue-700">System Info</h3>
                <ul className="list-disc pl-5 text-gray-700">
                    <li>Backend: FastAPI</li>
                    <li>Worker: Python</li>
                    <li>Database: SQLite</li>
                </ul>
            </div>
        </div>
    );
};

export default JobForm;
