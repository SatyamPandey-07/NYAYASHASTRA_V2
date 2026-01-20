import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  ZoomIn,
  ZoomOut,
  FileText,
  Scale,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";

interface HighlightedSection {
  text: string;
  page?: number;
  startIndex?: number;
  endIndex?: number;
  confidence?: number;
}

interface CitationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: {
    id: string;
    title: string;
    source: string;
    url: string;
    excerpt?: string;
    takeaway?: string;
    documentContent?: string;
    highlightedSections?: HighlightedSection[];
  } | null;
  language: "en" | "hi";
}

export const CitationViewer = ({
  isOpen,
  onClose,
  citation,
  language,
}: CitationViewerProps) => {
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedMatches, setHighlightedMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm && citation?.documentContent) {
      const regex = new RegExp(searchTerm, "gi");
      const matches: number[] = [];
      let match;
      while ((match = regex.exec(citation.documentContent)) !== null) {
        matches.push(match.index);
      }
      setHighlightedMatches(matches);
      setCurrentMatch(0);
    } else {
      setHighlightedMatches([]);
    }
  }, [searchTerm, citation?.documentContent]);

  const copyToClipboard = async () => {
    if (citation?.excerpt) {
      await navigator.clipboard.writeText(citation.excerpt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderHighlightedContent = () => {
    // If we have document content, show it with highlighting
    if (citation?.documentContent) {
      let content = citation.documentContent;

      // Highlight the cited sections
      if (
        citation.highlightedSections &&
        citation.highlightedSections.length > 0
      ) {
        citation.highlightedSections.forEach((section, idx) => {
          const escapedText = section.text.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const regex = new RegExp(`(${escapedText})`, "gi");
          content = content.replace(
            regex,
            `<mark class="citation-highlight citation-highlight-${idx}" data-confidence="${section.confidence || 100}">$1</mark>`,
          );
        });
      }

      // Highlight search matches
      if (searchTerm) {
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escapedSearch})`, "gi");
        content = content.replace(
          regex,
          '<mark class="search-highlight">$1</mark>',
        );
      }

      return (
        <div
          ref={contentRef}
          className="prose prose-sm dark:prose-invert max-w-none p-6"
          style={{ fontSize: `${zoom}%` }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // If we have excerpt but no full document, show excerpt prominently
    if (citation?.excerpt) {
      return (
        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                {language === "en" ? "Legal Text Extract" : "कानूनी पाठ का अंश"}
              </h3>
            </div>
            <blockquote
              className="text-foreground/90 leading-relaxed border-l-4 border-primary/50 pl-4 py-2 italic"
              style={{ fontSize: `${zoom}%` }}
            >
              {citation.excerpt}
            </blockquote>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 flex items-center gap-3">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {language === "en"
                  ? "View Full Document"
                  : "पूर्ण दस्तावेज़ देखें"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "en"
                  ? 'Click "View Source" above to open the complete official document'
                  : '"स्रोत देखें" पर क्लिक करें पूर्ण आधिकारिक दस्तावेज़ खोलने के लिए'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Fallback for no content
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">
          {language === "en" ? "Document Preview" : "दस्तावेज़ पूर्वावलोकन"}
        </p>
        <p className="text-sm mt-2 text-center">
          {language === "en"
            ? 'Click "View Source" to open the official document'
            : '"स्रोत देखें" पर क्लिक करके आधिकारिक दस्तावेज़ खोलें'}
        </p>
      </div>
    );
  };

  if (!isOpen || !citation) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={citation?.id || 'citation-modal'}
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
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground line-clamp-1">
                  {citation.title}
                </h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {citation.source.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/10">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    language === "en"
                      ? "Search in document..."
                      : "दस्तावेज़ में खोजें..."
                  }
                  className="pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {highlightedMatches.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {currentMatch + 1}/{highlightedMatches.length}
                  </span>
                )}
              </div>

              {/* Navigation for search results */}
              {highlightedMatches.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentMatch(Math.max(0, currentMatch - 1))
                    }
                    disabled={currentMatch === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentMatch(
                        Math.min(
                          highlightedMatches.length - 1,
                          currentMatch + 1,
                        ),
                      )
                    }
                    disabled={currentMatch === highlightedMatches.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* External link */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(citation.url, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                {language === "en" ? "View Source" : "स्रोत देखें"}
              </Button>
            </div>
          </div>

          {/* Citation Excerpt Highlight */}
          {citation.excerpt && (
            <div className="mx-4 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {language === "en" ? "Cited Excerpt" : "उद्धृत अंश"}
                    </span>
                    <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-green-500/10 rounded-full">
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-[10px] text-green-600 font-medium">
                        {language === "en" ? "Verified" : "सत्यापित"}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed italic">
                    "{citation.excerpt}"
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  ) }
                </Button>
              </div>
              
              {/* Added: Actionable Takeaway Section */}
              {citation.takeaway && (
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      {language === "en" ? "Expert Interpretation" : "विशेषज्ञ व्याख्या"}
                    </span>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 border-l-4 border-primary">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {citation.takeaway}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Document Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-background border border-border rounded-xl min-h-full">
              {renderHighlightedContent()}
            </div>
          </div>

          {/* Footer with verification info */}
          <div className="p-4 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span>
                    {language === "en"
                      ? "Citation highlighted"
                      : "उद्धरण हाइलाइट किया गया"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/50" />
                  <span>
                    {language === "en" ? "Search match" : "खोज मिलान"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "en"
                  ? "🔒 Source verified from official legal databases"
                  : "🔒 आधिकारिक कानूनी डेटाबेस से स्रोत सत्यापित"}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Custom styles for highlights */}
      <style>{`
        .citation-highlight {
          background: linear-gradient(120deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.4) 100%);
          padding: 2px 4px;
          border-radius: 4px;
          border-bottom: 2px solid rgb(251, 191, 36);
          transition: all 0.2s ease;
        }
        .citation-highlight:hover {
          background: linear-gradient(120deg, rgba(251, 191, 36, 0.5) 0%, rgba(251, 191, 36, 0.6) 100%);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
        }
        .search-highlight {
          background: rgba(var(--primary), 0.3);
          padding: 1px 2px;
          border-radius: 2px;
        }
      `}</style>
    </AnimatePresence>
  );
};

export default CitationViewer;
