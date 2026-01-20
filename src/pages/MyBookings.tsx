import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Scale,
  ArrowLeft,
  Globe,
  Loader2,
  CalendarCheck,
  AlertCircle,
  Video,
  XCircle,
  CheckCircle,
  Clock4,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: number;
  booking_id: string;
  user_email: string;
  domain: string;
  date: string;
  time: string;
  category: string;
  message?: string;
  lawyer_name: string;
  meeting_id: string;
  meeting_password: string;
  status: string;
  transaction_id?: string;
  amount_paid?: number;
  created_at: string;
}

// Domain labels
const DOMAIN_LABELS: Record<string, { en: string; hi: string; icon: string }> = {
  criminal: { en: "Criminal Law", hi: "आपराधिक कानून", icon: "🔴" },
  civil: { en: "Civil Law", hi: "नागरिक कानून", icon: "⚖️" },
  it: { en: "IT & Cyber Law", hi: "IT और साइबर कानून", icon: "💻" },
  family: { en: "Family Law", hi: "पारिवारिक कानून", icon: "👨‍👩‍👧" },
  corporate: { en: "Corporate Law", hi: "कॉर्पोरेट कानून", icon: "🏢" },
};

// Category labels
const CATEGORY_LABELS: Record<string, { en: string; hi: string }> = {
  urgent: { en: "Urgent", hi: "तत्काल" },
  sue: { en: "Filing Lawsuit", hi: "मुकदमा" },
  arrest: { en: "Arrest/Detention", hi: "गिरफ्तारी" },
  general: { en: "General", hi: "सामान्य" },
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;
      
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/booking/my-bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBookings(data.bookings || []);
        } else {
          console.error("Failed to fetch bookings");
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchBookings();
    }
  }, [user, isLoaded, getToken]);

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/booking/booking/${bookingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId ? { ...b, status: "cancelled" } : b
          )
        );
        toast({
          title: language === "en" ? "Booking Cancelled" : "बुकिंग रद्द",
          description: language === "en" 
            ? "Your booking has been cancelled successfully" 
            : "आपकी बुकिंग सफलतापूर्वक रद्द कर दी गई है",
        });
      } else {
        throw new Error("Failed to cancel");
      }
    } catch (error) {
      toast({
        title: language === "en" ? "Error" : "त्रुटि",
        description: language === "en" 
          ? "Failed to cancel booking" 
          : "बुकिंग रद्द करने में विफल",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get status badge
  const getStatusBadge = (status: string, date: string) => {
    const bookingDate = new Date(date);
    const today = new Date();
    const isPast = bookingDate < today;

    if (status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-medium">
          <XCircle className="h-3 w-3" />
          {language === "en" ? "Cancelled" : "रद्द"}
        </span>
      );
    }

    if (isPast) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
          <CheckCircle className="h-3 w-3" />
          {language === "en" ? "Completed" : "पूर्ण"}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">
        <Clock4 className="h-3 w-3" />
        {language === "en" ? "Upcoming" : "आगामी"}
      </span>
    );
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen texture-noise flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {language === "en" ? "Loading your bookings..." : "आपकी बुकिंग लोड हो रही है..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen texture-noise">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-strong border-b border-border/50 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">
              {language === "en" ? "Back to Chat" : "चैट पर वापस जाएं"}
            </span>
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/national-emblem.png"
              alt="NYAYASHASTRA"
              className="h-8 w-8 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-serif font-bold">
                <span className="text-foreground">NYAYA</span>
                <span className="text-primary">SHASTRA</span>
              </h1>
            </div>
          </Link>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
            <Button
              variant={language === "en" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 rounded-full text-xs font-medium"
              onClick={() => setLanguage("en")}
            >
              <Globe className="h-3 w-3 mr-1" />
              EN
            </Button>
            <Button
              variant={language === "hi" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 rounded-full text-xs text-hindi font-medium"
              onClick={() => setLanguage("hi")}
            >
              हि
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Page Title */}
      <section className="py-8 md:py-12 px-4 text-center hero-pattern">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {language === "en" ? "Your Consultations" : "आपके परामर्श"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
            {language === "en" ? "My Bookings" : "मेरी बुकिंग"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {language === "en"
              ? "View and manage your lawyer consultation appointments"
              : "अपने वकील परामर्श अपॉइंटमेंट देखें और प्रबंधित करें"}
          </p>
        </motion.div>
      </section>

      {/* Bookings List */}
      <section className="py-8 px-4">
        <div className="container max-w-4xl mx-auto">
          {bookings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated rounded-2xl p-12 text-center"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-serif font-bold mb-2">
                {language === "en" ? "No Bookings Yet" : "अभी तक कोई बुकिंग नहीं"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "en"
                  ? "You haven't booked any lawyer consultations yet."
                  : "आपने अभी तक कोई वकील परामर्श बुक नहीं किया है।"}
              </p>
              <Button
                onClick={() => navigate("/booking")}
                className="rounded-xl btn-shimmer"
              >
                {language === "en" ? "Book a Consultation" : "परामर्श बुक करें"}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.booking_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-elevated rounded-2xl overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {DOMAIN_LABELS[booking.domain]?.icon || "⚖️"}
                        </span>
                        <div>
                          <p className="font-semibold">
                            {DOMAIN_LABELS[booking.domain]?.[language] || booking.domain}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {booking.booking_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status, booking.date)}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Lawyer */}
                        <div className="flex items-center gap-3">
                          <div className="icon-container">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {language === "en" ? "Lawyer" : "वकील"}
                            </p>
                            <p className="font-medium text-sm">{booking.lawyer_name}</p>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-3">
                          <div className="icon-container">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {language === "en" ? "Date" : "तिथि"}
                            </p>
                            <p className="font-medium text-sm">{formatDate(booking.date)}</p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-3">
                          <div className="icon-container">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {language === "en" ? "Time" : "समय"}
                            </p>
                            <p className="font-medium text-sm">{formatTime(booking.time)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Info */}
                      {booking.amount_paid && (
                        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>💳</span>
                            <span>
                              {language === "en" ? "Paid" : "भुगतान"}: ₹{booking.amount_paid}
                            </span>
                            {booking.transaction_id && (
                              <span className="text-xs font-mono">
                                ({booking.transaction_id})
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          {booking.status === "confirmed" && new Date(booking.date) >= new Date() && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleCancelBooking(booking.booking_id)}
                                disabled={cancellingId === booking.booking_id}
                              >
                                {cancellingId === booking.booking_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {language === "en" ? "Cancel" : "रद्द करें"}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Book Another CTA */}
          {bookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-8"
            >
              <Button
                onClick={() => navigate("/booking")}
                className="rounded-xl btn-shimmer"
              >
                {language === "en" ? "Book Another Consultation" : "एक और परामर्श बुक करें"}
              </Button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
