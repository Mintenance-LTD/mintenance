/**
 * @deprecated This file has been refactored into smaller components.
 * Please import from src/screens/home/index.ts instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import React from 'react';
import { HomeScreen as NewHomeScreen } from './home';

const HomeScreen: React.FC = () => {
  return <NewHomeScreen />;
};

export default HomeScreen;
