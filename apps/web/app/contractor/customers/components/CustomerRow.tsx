'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge.unified';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url: string | null;
}

interface CustomerRowProps {
  customer: Customer;
}

export function CustomerRow({ customer }: CustomerRowProps) {
  const customerName = `${customer.first_name} ${customer.last_name}`;
  const initials = `${customer.first_name[0]}${customer.last_name[0]}`.toUpperCase();

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
      <td className="py-4 px-6">
        <Link
          href={`/contractor/customers/${customer.id}`}
          className="flex items-center gap-3 group"
        >
          {/* Avatar */}
          {customer.profile_image_url ? (
            <img
              src={customer.profile_image_url}
              alt={customerName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xs font-semibold text-blue-700">
              {initials}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {customerName}
            </div>
            <div className="text-xs text-gray-500">{customer.email}</div>
          </div>
        </Link>
      </td>
      <td className="py-4 px-6">
        <Badge variant="success" size="sm">
          Active
        </Badge>
      </td>
      <td className="py-4 px-6">
        <div className="text-sm text-gray-900">Recent</div>
      </td>
    </tr>
  );
}

