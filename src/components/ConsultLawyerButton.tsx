import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gavel, Users, ArrowRight, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsultLawyerButtonProps {
    language: "en" | "hi";
    variant?: "default" | "compact" | "banner";
    className?: string;
}

export const ConsultLawyerButton = ({
    language,
    variant = "default",
    className = "",
}: ConsultLawyerButtonProps) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate("/booking");
    };

    if (variant === "banner") {
        return (
            <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleClick}
                className={`cursor-pointer feature-card p-6 group ${className}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="icon-container">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-serif font-semibold text-foreground group-hover:text-primary transition-colors">
                                {language === "en" ? "Need a Human Expert?" : "मानव विशेषज्ञ की आवश्यकता है?"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {language === "en"
                                    ? "Book a consultation with a licensed lawyer"
                                    : "एक लाइसेंस प्राप्त वकील के साथ परामर्श बुक करें"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium">
                        <span className="hidden sm:inline text-sm">
                            {language === "en" ? "Book Now" : "अभी बुक करें"}
                        </span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </motion.div>
        );
    }

    if (variant === "compact") {
        return (
            <Button
                onClick={handleClick}
                variant="outline"
                size="sm"
                className={`gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary rounded-xl transition-all ${className}`}
            >
                <Gavel className="w-4 h-4" />
                <span className="hidden sm:inline">
                    {language === "en" ? "Consult Lawyer" : "वकील से परामर्श"}
                </span>
            </Button>
        );
    }

    // Default variant
    return (
        <motion.button
            onClick={handleClick}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative overflow-hidden rounded-xl bg-primary p-[1px] shadow-lg hover:shadow-primary/25 transition-all duration-300 btn-shimmer ${className}`}
        >
            <div className="relative bg-primary rounded-xl px-6 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                    <p className="font-bold text-white text-sm">
                        {language === "en" ? "Consult a Lawyer" : "वकील से परामर्श करें"}
                    </p>
                    <p className="text-white/80 text-xs">
                        {language === "en" ? "Book a video consultation" : "वीडियो परामर्श बुक करें"}
                    </p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
        </motion.button>
    );
};
