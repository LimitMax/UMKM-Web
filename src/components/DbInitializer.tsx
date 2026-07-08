'use client';

import { useEffect } from 'react';
import { initializeDB } from '../services/db';

export default function DbInitializer() {
  useEffect(() => {
    initializeDB();
  }, []);

  return null;
}
