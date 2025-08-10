// calorie-frontend/src/app/dashboard/page.js
"use client";
import { useState, useEffect } from "react";
import { UserAuth } from "../context/AuthContext"; // Assuming your context is here
import Link from "next/link";

export default function Dashboard() {
    const { user } = UserAuth();
    const [meals, setMeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // This function runs when the component mounts
        const fetchMeals = async () => {
            if (!user) {
                setIsLoading(false);
                return; // Don't fetch if the user isn't logged in
            };

            try {
                // Call your /meals endpoint, passing the user's ID
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
    }, [user]); // The [user] dependency means this code re-runs if the user logs in or out

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
        <main className="max-w-7xl mx-auto p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Your Meal Dashboard</h1>
                <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    + Log New Meal
                </Link>
            </header>
            
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Calories</th>
                        </tr>
                    </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
        {meals.length > 0 ? meals.map(meal => (
            <tr key={meal.meal_id}>
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
    );
}