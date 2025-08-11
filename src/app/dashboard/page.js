// calorie-frontend/src/app/dashboard/page.js
"use client";
import { useState, useEffect } from "react";
import { UserAuth } from "../context/AuthContext";
import Link from "next/link";

export default function Dashboard() {
    const { user } = UserAuth();
    const [meals, setMeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- ✅ 1. State for the Invite Modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState("");
    const [inviteStatus, setInviteStatus] = useState(null); // To show sending/success/error messages

    useEffect(() => {
        const fetchMeals = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://calorie-counter-three-gamma.vercel.app';
                const response = await fetch(`${apiUrl}/meals?userId=${user.uid}`);
                
                if (!response.ok) {
                    throw new Error("Failed to fetch your meal history.");
                }
                const data = await response.json();
                setMeals(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMeals();
    }, [user]);

    // --- ✅ 2. Function to send the invitation ---
    const handleSendInvite = async () => {
        if (!recipientEmail || !user) {
            setInviteStatus("Please enter an email address.");
            return;
        }

        setInviteStatus("Sending..."); // Provide instant feedback

        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://calorie-counter-three-gamma.vercel.app';
            const response = await fetch(`${apiUrl}/invite-dashboard-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientEmail: recipientEmail,
                    userId: user.uid // Send the logged-in user's ID
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Failed to send invite.");
            }
            
            setInviteStatus("Invitation sent successfully!");
            setTimeout(() => { // Close modal after a short delay
                handleCloseModal();
            }, 2000);

        } catch (err) {
            setInviteStatus(`Error: ${err.message}`);
        }
    };

    // --- ✅ 3. Helper function to close and reset the modal ---
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setRecipientEmail("");
        setInviteStatus(null);
    };


    if (isLoading) {
        return <div className="text-center p-10">Loading your meal history...</div>;
    }

    if (!user) {
        return (
            <div className="text-center p-10">
                <p>Please sign in to view your dashboard.</p>
                <Link href="/" className="text-blue-600 hover:underline">Go to Home Page</Link>
            </div>
        );
    }
    
    return (
        <>
            <main className="max-w-7xl mx-auto p-8">
                <header className="flex justify-between items-center mb-8 gap-4">
                    <h1 className="text-4xl font-bold">Your Meal Dashboard</h1>
                    <div className="flex items-center gap-4">
                        {/* --- ✅ 4. Invite Friend Button --- */}
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                            Invite Friend
                        </button>
                        <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            + Log New Meal
                        </Link>
                    </div>
                </header>
                
                {error && <p className="text-red-500 text-center">{error}</p>}
                
                {/* Table for meal history (no changes here) */}
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        {/* ... your table head ... */}
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Calories</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {meals.length > 0 ? meals.map(meal => (
                                <tr key={meal.meal_id || meal.created_at}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(meal.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {meal.image_url && <img src={meal.image_url} alt="Log" className="h-16 w-16 object-cover rounded"/>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize font-medium text-gray-900">
                                        {meal.item_type}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {meal.item_type === 'food' && Array.isArray(meal.log_details) ? (
                                            <ul className="list-disc list-inside">
                                                {meal.log_details.map((item, index) => (
                                                    <li key={index}>{item.name}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="italic text-gray-600 truncate" title={meal.log_details?.transcript}>
                                                {meal.log_details?.transcript || "Workout Log"}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {meal.total_calories} kcal
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                        You haven't logged any meals or workouts yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- ✅ 5. The Invite Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Invite a Friend</h2>
                        <p className="mb-4 text-gray-600">Enter your friend's email to send them a link to view your dashboard.</p>
                        
                        <input 
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                        />

                        {inviteStatus && <p className="text-center mb-4 text-sm text-gray-700">{inviteStatus}</p>}

                        <div className="flex justify-end gap-4">
                            <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                                Cancel
                            </button>
                            <button 
                                onClick={handleSendInvite} 
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                                disabled={inviteStatus === "Sending..."}
                            >
                                {inviteStatus === "Sending..." ? "Sending..." : "Send Invite"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}