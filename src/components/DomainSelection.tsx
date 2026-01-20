import { motion } from "framer-motion";
import { 
  Scale, 
  ShieldCheck, 
  Building2, 
  Laptop, 
  TreePine, 
  Users, 
  Home,
  ArrowRight 
} from "lucide-react";

interface DomainOption {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DOMAINS: DomainOption[] = [
  {
    id: "criminal",
    name: "Criminal Law",
    nameHi: "आपराधिक कानून",
    description: "IPC, BNS, FIR, Bail, Arrest",
    icon: <ShieldCheck className="w-8 h-8" />,
    color: "#dc2626",
  },
  {
    id: "environmental",
    name: "Environmental Law",
    nameHi: "पर्यावरण कानून",
    description: "Environment Act, Pollution, NGT",
    icon: <TreePine className="w-8 h-8" />,
    color: "#16a34a",
  },
  {
    id: "corporate",
    name: "Corporate Law",
    nameHi: "कॉर्पोरेट कानून",
    description: "Companies Act, SEBI, Contracts",
    icon: <Building2 className="w-8 h-8" />,
    color: "#2563eb",
  },
  {
    id: "it_cyber",
    name: "IT & Cyber Law",
    nameHi: "आईटी और साइबर कानून",
    description: "IT Act, Data Protection, Cybercrime",
    icon: <Laptop className="w-8 h-8" />,
    color: "#7c3aed",
  },
  {
    id: "family",
    name: "Family Law",
    nameHi: "पारिवारिक कानून",
    description: "Marriage, Divorce, Custody",
    icon: <Users className="w-8 h-8" />,
    color: "#db2777",
  },
  {
    id: "property",
    name: "Property Law",
    nameHi: "संपत्ति कानून",
    description: "Land, Real Estate, Registration",
    icon: <Home className="w-8 h-8" />,
    color: "#ea580c",
  },
  {
    id: "all",
    name: "All Domains",
    nameHi: "सभी क्षेत्र",
    description: "General legal queries across all domains",
    icon: <Scale className="w-8 h-8" />,
    color: "#c9a227",
  },
];

interface DomainSelectionProps {
  language: "en" | "hi";
  onSelectDomain: (domainId: string) => void;
  onBack?: () => void;
}

export const DomainSelection = ({ language, onSelectDomain, onBack }: DomainSelectionProps) => {
  const isHindi = language === "hi";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"
          >
            <Scale className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isHindi ? "कानूनी क्षेत्र चुनें" : "Select Legal Domain"}
          </h1>
          <p className="text-muted-foreground">
            {isHindi 
              ? "बेहतर सहायता के लिए अपना कानूनी क्षेत्र चुनें"
              : "Choose your legal domain for more accurate assistance"}
          </p>
        </div>

        {/* Domain Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {DOMAINS.map((domain, index) => (
            <motion.button
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectDomain(domain.id)}
              className="group relative p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm 
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 
                         transition-all duration-300 text-left"
            >
              {/* Icon with color */}
              <div 
                className="flex items-center justify-center w-14 h-14 rounded-xl mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${domain.color}15` }}
              >
                <div style={{ color: domain.color }}>
                  {domain.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {isHindi ? domain.nameHi : domain.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {domain.description}
              </p>

              {/* Arrow indicator */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Back button */}
        {onBack && (
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isHindi ? "← वापस जाएं" : "← Go Back"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
