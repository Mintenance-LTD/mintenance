"use client";

import React from "react";

interface LineItem {
  id: string;
  label: string;
  amount: number;
  isDiscount?: boolean;
  description?: string;
  link?: string;
}

interface PricingBreakdownProps {
  items: LineItem[];
  subtotal: number;
  total: number;
  currency?: string;
  className?: string;
  showSubtotal?: boolean;
}

export const PricingBreakdown: React.FC<PricingBreakdownProps> = ({
  items,
  subtotal,
  total,
  currency = "£",
  className = "",
  showSubtotal = true,
}) => {
  const formatAmount = (amount: number, isDiscount: boolean = false) => {
    const formattedAmount = Math.abs(amount).toFixed(2);
    if (isDiscount) {
      return `-${currency}${formattedAmount}`;
    }
    return `${currency}${formattedAmount}`;
  };

  return (
    <div className={`bg-white rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Price breakdown</h3>

      {/* Line Items */}
      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-start">
            <div className="flex-1">
              {item.link ? (
                <a
                  href={item.link}
                  className="text-gray-700 hover:text-gray-900 underline decoration-gray-400 hover:decoration-gray-900 transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-gray-700">{item.label}</span>
              )}
              {item.description && (
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              )}
            </div>
            <span
              className={`font-medium ml-4 flex-shrink-0 ${
                item.isDiscount ? "text-green-600" : "text-gray-900"
              }`}
            >
              {formatAmount(item.amount, item.isDiscount)}
            </span>
          </div>
        ))}
      </div>

      {/* Subtotal */}
      {showSubtotal && (
        <div className="flex justify-between items-center py-3 border-t border-gray-200">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-medium text-gray-900">
            {currency}
            {subtotal.toFixed(2)}
          </span>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-300">
        <span className="text-lg font-medium text-gray-900">Total</span>
        <span className="text-lg font-medium text-gray-900">
          {currency}
          {total.toFixed(2)}
        </span>
      </div>

      {/* Tax Note */}
      <p className="text-sm text-gray-500 mt-4">
        All prices include applicable taxes
      </p>
    </div>
  );
};

export default PricingBreakdown;
