import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Comparison from "./pages/Comparison";
import Documents from "./pages/Documents";
import NotFound from "./pages/NotFound";
import SignInPage from "./pages/SignInPage";
import Booking from "./pages/Booking";
import BookingConfirmation from "./pages/BookingConfirmation";
import MyBookings from "./pages/MyBookings";
import { LandingPage } from "./components/LandingPage";

import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { ChatProvider } from "./hooks/useChatContext";

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// Clerk appearance customization to match landing page
const clerkAppearance = {
  variables: {
    colorPrimary: '#c9a227',
    colorBackground: '#faf7f2',
    colorText: '#1a1a1a',
    colorTextSecondary: '#666666',
    borderRadius: '1rem',
    fontFamily: '"Playfair Display", "Noto Serif Devanagari", Georgia, serif',
  },
};

// Wrapper component for LandingPage to handle sign-in flow
const LandingPageWrapper = () => {
  const navigate = useNavigate();

  const handleStartChat = () => {
    // Navigate to full-page sign-in
    navigate('/sign-in');
  };

  return (
    <LandingPage language="en" onStartChat={handleStartChat} />
  );
};

const App = () => (
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} appearance={clerkAppearance}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChatProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <SignedIn>
                      <Index />
                    </SignedIn>
                    <SignedOut>
                      <LandingPageWrapper />
                    </SignedOut>
                  </>
                }
              />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/comparison" element={<SignedIn><Comparison /></SignedIn>} />
              <Route path="/documents" element={<SignedIn><Documents /></SignedIn>} />
              <Route path="/booking" element={<SignedIn><Booking /></SignedIn>} />
              <Route path="/booking-confirmation" element={<SignedIn><BookingConfirmation /></SignedIn>} />
              <Route path="/my-bookings" element={<SignedIn><MyBookings /></SignedIn>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
