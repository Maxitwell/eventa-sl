import React from "react";

export function EventCardSkeleton() {
    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full animate-pulse transition-all">
            {/* Image Placeholder */}
            <div className="relative h-56 w-full bg-gray-200" />

            {/* Content Container */}
            <div className="p-6 flex flex-col flex-grow">
                {/* Header (Date and Category) */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gray-200" />
                        <div>
                            <div className="w-12 h-3 bg-gray-200 rounded mb-2" />
                            <div className="w-16 h-4 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>

                {/* Title and Location */}
                <div className="mb-4 space-y-2">
                    <div className="w-full h-6 bg-gray-200 rounded" />
                    <div className="w-2/3 h-6 bg-gray-200 rounded" />
                    <div className="w-1/2 h-3 bg-gray-200 rounded mt-2" />
                </div>

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Footer (Price and Waitlist) */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                    <div className="w-20 h-5 bg-gray-200 rounded" />
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                    </div>
                </div>
            </div>
        </div>
    );
}
