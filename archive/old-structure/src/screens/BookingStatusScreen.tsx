/**
 * @deprecated This file has been refactored into smaller components.
 * Please import from src/screens/booking/index.ts instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import React from 'react';
import { BookingStatusScreen as NewBookingStatusScreen } from './booking';

const BookingStatusScreen: React.FC<any> = (props) => {
  return <NewBookingStatusScreen {...props} />;
};

export default BookingStatusScreen;
