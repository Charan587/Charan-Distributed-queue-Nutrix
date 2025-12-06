import React from 'react';

const JobDashboard = ({ jobs }) => {
    return (
        <div className="border border-gray-300 p-5 rounded-lg shadow-sm bg-white">
            <h3 className="text-2xl font-bold mb-4 text-blue-700">Job Queue</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                        <tr className="border-b border-gray-200 text-left bg-blue-100 text-blue-800">
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Job ID</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Tenant ID</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Type</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Status</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Retries</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Worker</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Result / Error</th>
                            <th className="p-3 border border-gray-200 text-sm font-semibold">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="p-5 text-center text-gray-500 italic">
                                    No jobs found.
                                </td>
                            </tr>
                        ) : (
                            jobs.map(job => (
                                <tr key={job.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200 ease-in-out">
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm text-gray-800">{job.id.slice(0, 8)}</td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm text-gray-700">{job.tenant_id}</td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm text-gray-700">{job.type}</td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                              job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                              job.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-gray-100 text-gray-800'}
                                        `}>{job.status}</span>
                                    </td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm text-gray-700">{job.retry_count}</td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm text-gray-700">{job.worker_id ? job.worker_id.slice(0, 6) : '-'}</td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-700" title={JSON.stringify(job.result)}>
                                        {job.result ? (job.result.error || JSON.stringify(job.result)) : '-'}
                                    </td>
                                    <td className="p-3 border border-gray-200 text-xs sm:text-sm text-gray-700">{new Date(job.created_at).toLocaleTimeString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default JobDashboard;
