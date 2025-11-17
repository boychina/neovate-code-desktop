// @ts-nocheck
import { create } from 'zustand';

// Simple test to verify zustand is working
const useTestStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

console.log('Testing basic zustand functionality...');

const store = useTestStore.getState();
console.log('Initial count:', store.count);

store.increment();
console.log('Count after increment:', store.count);
