import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Lock,
  Check,
  X,
  Loader2,
  Shield,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
  amount: number;
  domain: string;
  category: string;
  language: "en" | "hi";
}

// Consultation pricing based on category
export const CONSULTATION_PRICING = {
  urgent: { amount: 1500, label: "Urgent Consultation", labelHi: "तत्काल परामर्श" },
  sue: { amount: 1000, label: "Filing a Lawsuit", labelHi: "मुकदमा दायर करना" },
  arrest: { amount: 1200, label: "Arrest/Detention", labelHi: "गिरफ्तारी/हिरासत" },
  general: { amount: 500, label: "General Consultation", labelHi: "सामान्य परामर्श" },
};

export const PaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  amount,
  domain,
  category,
  language,
}: PaymentModalProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setCardHolder("");
      setPaymentStatus("idle");
      setError("");
    }
  }, [isOpen]);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async () => {
    // Basic validation
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      setError(language === "en" ? "Please enter a valid 16-digit card number" : "कृपया एक वैध 16-अंकीय कार्ड नंबर दर्ज करें");
      return;
    }
    if (expiry.length !== 5) {
      setError(language === "en" ? "Please enter a valid expiry date (MM/YY)" : "कृपया एक वैध समाप्ति तिथि दर्ज करें (MM/YY)");
      return;
    }
    if (cvv.length !== 3) {
      setError(language === "en" ? "Please enter a valid 3-digit CVV" : "कृपया एक वैध 3-अंकीय CVV दर्ज करें");
      return;
    }
    if (cardHolder.length < 3) {
      setError(language === "en" ? "Please enter the cardholder name" : "कृपया कार्डधारक का नाम दर्ज करें");
      return;
    }

    setError("");
    setIsProcessing(true);
    setPaymentStatus("processing");

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For demo: Accept any card starting with 4 (Visa-like)
    if (cardNumber.startsWith("4")) {
      const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setPaymentStatus("success");
      
      // Wait for success animation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onSuccess(transactionId);
    } else {
      setPaymentStatus("error");
      setError(language === "en" 
        ? "Payment failed. For demo, use card starting with 4 (e.g., 4111 1111 1111 1111)" 
        : "भुगतान विफल। डेमो के लिए, 4 से शुरू होने वाले कार्ड का उपयोग करें");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {language === "en" ? "Secure Payment" : "सुरक्षित भुगतान"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {language === "en" ? "SSL Encrypted" : "SSL एन्क्रिप्टेड"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Payment Success Animation */}
          {paymentStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4"
              >
                <Check className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-green-600 mb-2">
                {language === "en" ? "Payment Successful!" : "भुगतान सफल!"}
              </h3>
              <p className="text-muted-foreground text-center">
                {language === "en" 
                  ? "Redirecting to confirmation..." 
                  : "पुष्टि पेज पर रीडायरेक्ट हो रहा है..."}
              </p>
            </motion.div>
          )}

          {/* Payment Form */}
          {paymentStatus !== "success" && (
            <div className="p-6 space-y-6">
              {/* Amount Display */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {language === "en" ? "Consultation Fee" : "परामर्श शुल्क"}
                    </p>
                    <p className="text-sm text-foreground font-medium mt-1">
                      {CONSULTATION_PRICING[category as keyof typeof CONSULTATION_PRICING]?.[language === "hi" ? "labelHi" : "label"] || domain}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">₹{amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === "en" ? "incl. GST" : "GST सहित"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Form */}
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {language === "en" ? "Card Number" : "कार्ड नंबर"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4111 1111 1111 1111"
                      maxLength={19}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all pl-12"
                    />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      {language === "en" ? "Expiry Date" : "समाप्ति तिथि"}
                    </label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="•••"
                      maxLength={3}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Card Holder */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {language === "en" ? "Cardholder Name" : "कार्डधारक का नाम"}
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="JOHN DOE"
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all uppercase"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Demo Card Hint */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  {language === "en" 
                    ? "Demo: Use 4111 1111 1111 1111, any expiry & CVV" 
                    : "डेमो: 4111 1111 1111 1111, कोई भी एक्सपायरी और CVV उपयोग करें"}
                </span>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full py-6 text-lg font-semibold rounded-xl btn-shimmer glow-primary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {language === "en" ? "Processing..." : "प्रोसेसिंग..."}
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    {language === "en" ? `Pay ₹${amount}` : `₹${amount} भुगतान करें`}
                  </>
                )}
              </Button>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>PCI DSS</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;
