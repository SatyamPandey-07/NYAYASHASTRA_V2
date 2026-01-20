import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Shield,
  Laptop,
  Users,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  Gavel,
  Handshake,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  ArrowLeft,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PaymentModal, CONSULTATION_PRICING } from "@/components/PaymentModal";

// Domain options with icons
const DOMAINS = [
  {
    id: "criminal",
    label: "Criminal Law",
    labelHi: "आपराधिक कानून",
    description: "Cases involving crimes, arrests, and criminal defense",
    descriptionHi: "अपराध, गिरफ्तारी और आपराधिक बचाव से संबंधित मामले",
    icon: Shield,
  },
  {
    id: "civil",
    label: "Civil Law",
    labelHi: "नागरिक कानून",
    description: "Property disputes, contracts, and civil matters",
    descriptionHi: "संपत्ति विवाद, अनुबंध और नागरिक मामले",
    icon: Scale,
  },
  {
    id: "it",
    label: "IT & Cyber Law",
    labelHi: "IT और साइबर कानून",
    description: "Cyber crimes, data privacy, and tech disputes",
    descriptionHi: "साइबर अपराध, डेटा गोपनीयता और तकनीकी विवाद",
    icon: Laptop,
  },
  {
    id: "family",
    label: "Family Law",
    labelHi: "पारिवारिक कानून",
    description: "Divorce, custody, inheritance, and family matters",
    descriptionHi: "तलाक, हिरासत, विरासत और पारिवारिक मामले",
    icon: Users,
  },
  {
    id: "corporate",
    label: "Corporate Law",
    labelHi: "कॉर्पोरेट कानून",
    description: "Business law, compliance, and corporate disputes",
    descriptionHi: "व्यापार कानून, अनुपालन और कॉर्पोरेट विवाद",
    icon: Building2,
  },
];

// Time slots from 10 AM to 6 PM
const TIME_SLOTS = [
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
];

// Category options
const CATEGORIES = [
  {
    id: "urgent",
    label: "Urgent Consultation",
    labelHi: "तत्काल परामर्श",
    description: "Need immediate legal advice",
    descriptionHi: "तत्काल कानूनी सलाह की आवश्यकता",
    icon: AlertTriangle,
  },
  {
    id: "sue",
    label: "Filing a Lawsuit",
    labelHi: "मुकदमा दायर करना",
    description: "Want to sue someone or a company",
    descriptionHi: "किसी व्यक्ति या कंपनी पर मुकदमा करना",
    icon: Gavel,
  },
  {
    id: "arrest",
    label: "Arrest/Detention",
    labelHi: "गिरफ्तारी/हिरासत",
    description: "Need help with arrest or detention matters",
    descriptionHi: "गिरफ्तारी या हिरासत के मामलों में मदद",
    icon: Shield,
  },
  {
    id: "general",
    label: "General Consultation",
    labelHi: "सामान्य परामर्श",
    description: "General legal advice and consultation",
    descriptionHi: "सामान्य कानूनी सलाह और परामर्श",
    icon: Handshake,
  },
];

interface BookingFormData {
  domain: string;
  date: string;
  time: string;
  category: string;
  message: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Booking() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    domain: "",
    date: "",
    time: "",
    category: "",
    message: "",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split("T")[0];
  };

  const handleDomainSelect = (domainId: string) => {
    setFormData({ ...formData, domain: domainId });
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, category: categoryId });
  };

  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 2:
        return formData.domain !== "";
      case 3:
        return formData.domain !== "" && formData.date !== "" && formData.time !== "";
      case 4:
        return formData.domain !== "" && formData.date !== "" && formData.time !== "" && formData.category !== "";
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceedToStep(currentStep + 1)) {
      if (currentStep === 3) {
        // Step 3 -> Step 4: Show payment modal
        setShowPaymentModal(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (txnId: string) => {
    setTransactionId(txnId);
    setShowPaymentModal(false);
    // Auto-submit after payment
    handleSubmitAfterPayment(txnId);
  };

  // Get consultation price
  const getConsultationPrice = (): number => {
    return CONSULTATION_PRICING[formData.category as keyof typeof CONSULTATION_PRICING]?.amount || 500;
  };

  const handleSubmitAfterPayment = async (txnId: string) => {
    if (!user || !formData.category) {
      toast({
        title: language === "en" ? "Error" : "त्रुटि",
        description: language === "en" ? "Please complete all required fields" : "कृपया सभी आवश्यक फ़ील्ड भरें",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/booking/book-consultation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain: formData.domain,
          date: formData.date,
          time: formData.time,
          category: formData.category,
          message: formData.message || null,
          user_email: user.primaryEmailAddress?.emailAddress || "",
          transaction_id: txnId,
          amount_paid: getConsultationPrice(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.message || "Failed to book consultation");
      }

      const data = await response.json();

      // Navigate to confirmation page with booking data
      navigate("/booking-confirmation", {
        state: {
          bookingId: data.booking_id,
          lawyerName: data.lawyer_name,
          userEmail: user.primaryEmailAddress?.emailAddress,
          domain: formData.domain,
          date: formData.date,
          time: formData.time,
          transactionId: txnId,
          amountPaid: getConsultationPrice(),
        },
      });
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: language === "en" ? "Booking Failed" : "बुकिंग विफल",
        description: error instanceof Error ? error.message : "Failed to book consultation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen texture-noise flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{language === "en" ? "Loading..." : "लोड हो रहा है..."}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/sign-in");
    return null;
  }

  const stepLabels = {
    1: { en: "Select Domain", hi: "डोमेन चुनें" },
    2: { en: "Schedule", hi: "समय निर्धारित करें" },
    3: { en: "Details", hi: "विवरण" },
    4: { en: "Payment", hi: "भुगतान" },
  };

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
            <span className="hidden sm:inline">{language === "en" ? "Back to Chat" : "चैट पर वापस जाएं"}</span>
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
            <Gavel className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {language === "en" ? "Book a Consultation" : "परामर्श बुक करें"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
            {language === "en" ? "Consult a Lawyer" : "वकील से परामर्श करें"}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {language === "en"
              ? "Schedule a video consultation with our experienced legal experts"
              : "हमारे अनुभवी कानूनी विशेषज्ञों के साथ वीडियो परामर्श शेड्यूल करें"}
          </p>
        </motion.div>
      </section>

      {/* Progress Bar */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: currentStep >= step ? 1 : 0.9 }}
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                  ${currentStep >= step
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border text-muted-foreground"
                  }
                `}
              >
                {currentStep > step ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <span className="text-lg font-bold">{step}</span>
                )}
              </motion.div>
              {step < 3 && (
                <div
                  className={`w-16 md:w-32 h-1 mx-2 rounded-full transition-all duration-300 ${currentStep > step ? "bg-primary" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm mb-8">
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={currentStep >= step ? "text-primary font-medium" : "text-muted-foreground"}
            >
              {stepLabels[step as keyof typeof stepLabels][language]}
            </span>
          ))}
        </div>

        {/* Form Steps */}
        <AnimatePresence mode="wait">
          {/* Step 1: Domain Selection */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold mb-2">
                  {language === "en" ? "Choose Legal Domain" : "कानूनी डोमेन चुनें"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "Select the area of law that best matches your needs"
                    : "वह कानून का क्षेत्र चुनें जो आपकी आवश्यकताओं से मेल खाता हो"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DOMAINS.map((domain) => {
                  const Icon = domain.icon;
                  const isSelected = formData.domain === domain.id;

                  return (
                    <motion.button
                      key={domain.id}
                      onClick={() => handleDomainSelect(domain.id)}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        feature-card p-6 text-left transition-all duration-300
                        ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}
                      `}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}

                      <div className="icon-container w-fit mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>

                      <h3 className="text-lg font-serif font-semibold mb-1">
                        {language === "hi" ? domain.labelHi : domain.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === "hi" ? domain.descriptionHi : domain.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Date and Time Selection */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold mb-2">
                  {language === "en" ? "Schedule Your Consultation" : "अपना परामर्श शेड्यूल करें"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "Choose a convenient date and time for your session"
                    : "अपने सत्र के लिए एक सुविधाजनक तिथि और समय चुनें"}
                </p>
              </div>

              <div className="max-w-xl mx-auto">
                <div className="card-elevated rounded-2xl p-8">
                  {/* Date Selection */}
                  <div className="mb-8">
                    <label className="flex items-center gap-2 font-medium mb-3">
                      <div className="icon-container w-fit">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      {language === "en" ? "Select Date" : "तिथि चुनें"}
                    </label>
                    <input
                      type="date"
                      min={getMinDate()}
                      max={getMaxDate()}
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="flex items-center gap-2 font-medium mb-3">
                      <div className="icon-container w-fit">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      {language === "en" ? "Select Time Slot" : "समय स्लॉट चुनें"}
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.value}
                          onClick={() => setFormData({ ...formData, time: slot.value })}
                          className={`
                            px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200
                            ${formData.time === slot.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 text-foreground hover:bg-primary/10 hover:text-primary border border-border"
                            }
                          `}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Category and Message */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold mb-2">
                  {language === "en" ? "Consultation Details" : "परामर्श विवरण"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "en" ? "Tell us more about your legal needs" : "अपनी कानूनी आवश्यकताओं के बारे में बताएं"}
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                {/* Category Selection */}
                <div className="card-elevated rounded-2xl p-6">
                  <label className="flex items-center gap-2 font-medium mb-4">
                    <div className="icon-container w-fit">
                      <Gavel className="w-4 h-4 text-primary" />
                    </div>
                    {language === "en" ? "Consultation Category" : "परामर्श श्रेणी"}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.id;

                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`
                            flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left
                            ${isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/50"
                            }
                          `}
                        >
                          <div className={`icon-container w-fit mt-0.5 ${isSelected ? "bg-primary/20" : ""}`}>
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{language === "hi" ? cat.labelHi : cat.label}</h4>
                            <p className="text-sm text-muted-foreground">
                              {language === "hi" ? cat.descriptionHi : cat.description}
                            </p>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-primary mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Message */}
                <div className="card-elevated rounded-2xl p-6">
                  <label className="flex items-center gap-2 font-medium mb-3">
                    <div className="icon-container w-fit">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    {language === "en" ? "Additional Message (Optional)" : "अतिरिक्त संदेश (वैकल्पिक)"}
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={
                      language === "en"
                        ? "Describe your legal issue or any specific questions you have..."
                        : "अपनी कानूनी समस्या या कोई विशिष्ट प्रश्न बताएं..."
                    }
                    className="min-h-[120px] bg-background border-border focus:ring-primary/50 focus:border-primary resize-none"
                  />
                </div>

                {/* User Email Display */}
                <div className="stat-card rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="icon-container w-fit">
                      <span className="text-lg">📧</span>
                    </div>
                    <div>
                      <p className="text-sm text-primary font-medium">
                        {language === "en" ? "Confirmation will be sent to" : "पुष्टिकरण भेजा जाएगा"}
                      </p>
                      <p className="font-medium">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-12 pb-8">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            className="px-6 py-3 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            {language === "en" ? "Back" : "पीछे"}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedToStep(currentStep + 1)}
              className="px-6 py-3 rounded-xl btn-shimmer"
            >
              {language === "en" ? "Next" : "आगे"}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isSubmitting || !formData.category}
              className="px-8 py-3 rounded-xl btn-shimmer glow-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {language === "en" ? "Processing..." : "प्रोसेसिंग..."}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  {language === "en" 
                    ? `Pay ₹${getConsultationPrice()} & Confirm` 
                    : `₹${getConsultationPrice()} भुगतान करें`}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        amount={getConsultationPrice()}
        domain={formData.domain}
        category={formData.category}
        language={language}
      />
    </div>
  );
}
