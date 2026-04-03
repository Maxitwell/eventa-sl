import React, { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    label?: string;
    error?: string;
    variant?: "default" | "auth";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, icon, label, error, variant = "default", ...props }, ref) => {
        const isAuth = variant === "auth";
        
        if (isAuth) {
            return (
                <div className="space-y-2 w-full">
                    {label && (
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">
                            {label}
                        </label>
                    )}
                    <div className="relative">
                        {icon && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg flex items-center justify-center">
                                {icon}
                            </div>
                        )}
                        <input
                            ref={ref}
                            className={twMerge(
                                clsx(
                                    "w-full pr-4 py-3 bg-gray-50 border-none rounded-md focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all placeholder:text-gray-400 outline-none text-gray-900",
                                    icon ? "pl-11" : "pl-4",
                                    error && "ring-2 ring-red-500",
                                    className
                                )
                            )}
                            {...props}
                        />
                    </div>
                    {error && <p className="mt-1 text-xs text-red-500 px-1">{error}</p>}
                </div>
            );
        }

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={twMerge(
                            clsx(
                                "form-input",
                                icon && "!pl-11",
                                error && "border-red-500 focus:border-red-500 focus:box-shadow-red",
                                className
                            )
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";
