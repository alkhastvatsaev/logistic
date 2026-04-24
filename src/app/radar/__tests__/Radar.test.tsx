import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeliveryRadar from '../page';
import { useAllRequests } from '@/hooks/useFirebase';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('@/hooks/useFirebase', () => ({
  useAllRequests: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('DeliveryRadar', () => {
  const mockPush = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    
    // Mock today to be April 24, 2026
    vi.setSystemTime(new Date(2026, 3, 24));
  });

  it('renders correctly with no requests', () => {
    (useAllRequests as any).mockReturnValue({ requests: [], loading: false });
    render(<DeliveryRadar />);
    
    expect(screen.getByText(/CALENDAR/i)).toBeDefined();
    expect(screen.getByText(/AUCUNE ÉCHÉANCE/i)).toBeDefined();
  });

  it('displays an event dot for a date with a delivery estimation', () => {
    const mockRequests = [
      {
        id: 'req1',
        title: 'ROLEX OYSTER',
        deliveryEstimation: new Date(2026, 3, 25).getTime(), // April 25
        status: 'SHIPPED'
      }
    ];
    
    (useAllRequests as any).mockReturnValue({ requests: mockRequests, loading: false });
    render(<DeliveryRadar />);
    
    // Check if the day 25 has an event (we can look for the dot or the date)
    const day25 = screen.getByText('25');
    expect(day25).toBeDefined();
    
    // Click on April 25
    fireEvent.click(day25);
    
    // Verify the order appears in the detail panel
    expect(screen.getByText('ROLEX OYSTER')).toBeDefined();
    expect(screen.getByText(/LIVRAISON STRASBOURG/i)).toBeDefined();
  });

  it('navigates between months correctly', () => {
    (useAllRequests as any).mockReturnValue({ requests: [], loading: false });
    render(<DeliveryRadar />);
    
    // Current is April 2026
    expect(screen.getByText(/avril 2026/i)).toBeDefined();
    
    // Click Next
    const nextBtn = screen.getAllByRole('button')[1]; // ChevronRight
    fireEvent.click(nextBtn);
    
    // Should be May 2026
    expect(screen.getByText(/mai 2026/i)).toBeDefined();
  });

  it('shows missing scheduling alert if requests have no dates', () => {
    const mockRequests = [
      {
        id: 'no-date-req',
        title: 'UNSCHEDULED PIECE',
        status: 'IN_PRODUCTION'
        // no deliveryEstimation
      }
    ];
    
    (useAllRequests as any).mockReturnValue({ requests: mockRequests, loading: false });
    render(<DeliveryRadar />);
    
    expect(screen.getByText(/CALENDRIER À DÉFINIR/i)).toBeDefined();
    expect(screen.getByText('UNSCHEDULED PIECE')).toBeDefined();
  });
});
