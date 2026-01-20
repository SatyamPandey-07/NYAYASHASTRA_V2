import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    Calendar,
    Clock,
    User,
    Mail,
    ArrowRight,
    MessageSquare,
    Scale,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface BookingConfirmationState {
    bookingId: string;
    lawyerName: string;
    userEmail: string;
    domain: string;
    date: string;
    time: string;
}

// Domain labels
const DOMAIN_LABELS: Record<string, { en: string; hi: string }> = {
    criminal: { en: "Criminal Law", hi: "आपराधिक कानून" },
    civil: { en: "Civil Law", hi: "नागरिक कानून" },
    it: { en: "IT & Cyber Law", hi: "IT और साइबर कानून" },
    family: { en: "Family Law", hi: "पारिवारिक कानून" },
    corporate: { en: "Corporate Law", hi: "कॉर्पोरेट कानून" },
};

export default function BookingConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as BookingConfirmationState | null;

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Format time for display
    const formatTime = (timeStr: string) => {
        if (!timeStr) return "";
        const [hours, minutes] = timeStr.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Trigger confetti on mount
    useEffect(() => {
        if (state) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            };

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    return;
                }

                const particleCount = 50 * (timeLeft / duration);

                confetti({
                    particleCount,
                    startVelocity: 30,
                    spread: 360,
                    origin: {
                        x: randomInRange(0.1, 0.9),
                        y: Math.random() - 0.2,
                    },
                    colors: ["#c9a227", "#16213e", "#10b981", "#0ea5e9"],
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [state]);

    // Redirect if no state
    if (!state) {
        return (
            <div className="min-h-screen texture-noise flex items-center justify-center px-4">
                <div className="card-elevated rounded-2xl p-8 text-center max-w-md">
                    <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-serif font-bold mb-2">No Booking Found</h2>
                    <p className="text-muted-foreground mb-6">
                        It seems you haven't made a booking yet or the page was refreshed.
                    </p>
                    <Button onClick={() => navigate("/booking")} className="rounded-xl">
                        Book a Consultation
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }

    const language: "en" | "hi" = "en";

    return (
        <div className="min-h-screen texture-noise">
            {/* Header */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="glass-strong border-b border-border/50 sticky top-0 z-50"
            >
                <div className="container mx-auto px-4 h-16 flex items-center justify-center">
                    <Link to="/" className="flex items-center gap-2">
                        <img
                            src="/national-emblem.png"
                            alt="NYAYASHASTRA"
                            className="h-8 w-8 object-contain"
                        />
                        <div>
                            <h1 className="text-lg font-serif font-bold">
                                <span className="text-foreground">NYAYA</span>
                                <span className="text-primary">SHASTRA</span>
                            </h1>
                        </div>
                    </Link>
                </div>
            </motion.header>

            {/* Main Content */}
            <section className="py-12 md:py-16 px-4">
                <div className="container max-w-2xl mx-auto">
                    {/* Success Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                        className="text-center mb-8"
                    >
                        <div className="relative inline-block">
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 0.8, 0.5],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-green-500/30 rounded-full blur-xl"
                            />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Success Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center mb-10"
                    >
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">
                            {language === "en" ? "Booking Confirmed!" : "बुकिंग की पुष्टि हो गई!"}
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            {language === "en"
                                ? "Your legal consultation has been scheduled successfully"
                                : "आपका कानूनी परामर्श सफलतापूर्वक निर्धारित हो गया है"}
                        </p>
                    </motion.div>

                    {/* Booking Details Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="card-elevated rounded-2xl overflow-hidden mb-6"
                    >
                        {/* Booking ID Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">
                                        {language === "en" ? "Booking ID" : "बुकिंग आईडी"}
                                    </p>
                                    <p className="text-2xl font-mono font-bold text-primary">{state.bookingId}</p>
                                </div>
                                <div className="stat-card rounded-xl px-4 py-2">
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <p className="text-sm font-bold text-green-600">✓ Confirmed</p>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="p-6 space-y-5">
                            {/* Lawyer */}
                            <div className="flex items-start gap-4">
                                <div className="icon-container">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-0.5">
                                        {language === "en" ? "Assigned Lawyer" : "नियुक्त वकील"}
                                    </p>
                                    <p className="text-lg font-semibold">{state.lawyerName}</p>
                                </div>
                            </div>

                            {/* Domain */}
                            <div className="flex items-start gap-4">
                                <div className="icon-container">
                                    <Scale className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-0.5">
                                        {language === "en" ? "Legal Domain" : "कानूनी डोमेन"}
                                    </p>
                                    <p className="text-lg font-semibold">
                                        {DOMAIN_LABELS[state.domain]?.[language] || state.domain}
                                    </p>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="icon-container">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-0.5">
                                            {language === "en" ? "Date" : "तिथि"}
                                        </p>
                                        <p className="font-semibold">{formatDate(state.date)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="icon-container">
                                        <Clock className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-0.5">
                                            {language === "en" ? "Time" : "समय"}
                                        </p>
                                        <p className="font-semibold">{formatTime(state.time)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Email Notice */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="stat-card rounded-2xl p-6 mb-8"
                    >
                        <div className="flex items-start gap-4">
                            <div className="icon-container bg-blue-500/10">
                                <Mail className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-1">
                                    {language === "en" ? "Check Your Email" : "अपना ईमेल देखें"}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {language === "en"
                                        ? "We've sent the meeting ID, password, and all details to:"
                                        : "हमने मीटिंग आईडी, पासवर्ड और सभी विवरण भेज दिए हैं:"}
                                </p>
                                <p className="text-primary font-medium">{state.userEmail}</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Important Notes */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8"
                    >
                        <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                            <span>⚠️</span>
                            {language === "en" ? "Important Notes" : "महत्वपूर्ण नोट्स"}
                        </h3>
                        <ul className="text-sm text-amber-800/80 dark:text-amber-300/80 space-y-2">
                            <li className="flex items-start gap-2">
                                <span>•</span>
                                {language === "en"
                                    ? "Join the meeting 5 minutes before the scheduled time"
                                    : "निर्धारित समय से 5 मिनट पहले मीटिंग में शामिल हों"}
                            </li>
                            <li className="flex items-start gap-2">
                                <span>•</span>
                                {language === "en"
                                    ? "Keep all relevant documents ready for discussion"
                                    : "चर्चा के लिए सभी संबंधित दस्तावेज तैयार रखें"}
                            </li>
                            <li className="flex items-start gap-2">
                                <span>•</span>
                                {language === "en"
                                    ? "Ensure stable internet connection for uninterrupted consultation"
                                    : "निर्बाध परामर्श के लिए स्थिर इंटरनेट कनेक्शन सुनिश्चित करें"}
                            </li>
                            <li className="flex items-start gap-2">
                                <span>•</span>
                                {language === "en"
                                    ? "This consultation is for informational purposes only"
                                    : "यह परामर्श केवल सूचनात्मक उद्देश्यों के लिए है"}
                            </li>
                        </ul>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Button
                            onClick={() => navigate("/")}
                            variant="outline"
                            className="px-6 py-3 rounded-xl"
                        >
                            <MessageSquare className="w-5 h-5 mr-2" />
                            {language === "en" ? "Back to Chat" : "चैट पर वापस जाएं"}
                        </Button>
                        <Button
                            onClick={() => navigate("/booking")}
                            className="px-6 py-3 rounded-xl btn-shimmer"
                        >
                            {language === "en" ? "Book Another" : "एक और बुक करें"}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-border mt-auto">
                <div className="container mx-auto text-center">
                    <p className="text-sm text-muted-foreground">
                        {language === "en"
                            ? "⚖️ This tool is for informational purposes only and does not constitute legal advice."
                            : "⚖️ यह उपकरण केवल सूचनात्मक उद्देश्यों के लिए है और कानूनी सलाह नहीं है।"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">© 2024 NYAYASHASTRA</p>
                </div>
            </footer>
        </div>
    );
}
