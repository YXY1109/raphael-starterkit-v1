"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, Volume2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface NameData {
  chinese: string;
  pinyin: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  meaning: string;
  culturalNotes: string;
  personalityMatch: string;
  style: string;
}

interface NameCardProps {
  name: NameData;
  isSelected: boolean;
  isLiked: boolean;
  onSelect: () => void;
  onLike: () => void;
  enableVoicePlayback?: boolean; // Control whether to show voice playback
}

export default function NameCard({ 
  name, 
  isSelected, 
  isLiked,
  onSelect, 
  onLike,
  enableVoicePlayback = true 
}: NameCardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meaning' | 'characters' | 'cultural'>('meaning');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);


  const handlePlayAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use voice playback.",
        variant: "destructive",
      });
      return;
    }

    if (isPlaying) {
      toast({
        title: "Audio playing",
        description: "Please wait for current audio to finish.",
      });
      return;
    }

    if (!safeName.chinese) {
      toast({
        title: "No text to play",
        description: "Unable to play audio for this name.",
        variant: "destructive",
      });
      return;
    }

    setIsPlaying(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: safeName.chinese
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 503) {
          throw new Error(errorData.message || 'Voice playback service is temporarily unavailable');
        }
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const result = await response.json();
      
      if (result.success && result.audioData) {
        // Convert base64 to audio and play
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0))], 
          { type: 'audio/mpeg' }
        );
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          toast({
            title: "Playback failed",
            description: "Unable to play the audio.",
            variant: "destructive",
          });
        };
        
        await audio.play();
        
        toast({
          title: "Playing audio",
          description: `Playing pronunciation of ${safeName.chinese}`,
        });
      } else {
        throw new Error('Invalid audio data received');
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      toast({
        title: "Playback failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
    }
  };

  const handleGeneratePDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate PDF certificate.",
        variant: "destructive",
      });
      return;
    }

    if (isGeneratingPDF) {
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // 获取用户的英文名字 - 这里需要从props或context获取
      // 暂时使用用户ID作为fallback
      const userData = {
        englishName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        gender: user.user_metadata?.gender || 'other'
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nameData: safeName,
          userData: userData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          toast({
            title: "Insufficient credits",
            description: errorData.error || "You need 1 credit to generate PDF certificate.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // 下载PDF文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeName.chinese}_certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF generated successfully!",
        description: `Certificate for ${safeName.chinese} has been downloaded.`,
      });

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast({
        title: "PDF generation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const tabs = [
    { id: 'meaning', label: 'Meaning' },
    { id: 'characters', label: 'Characters' },
    { id: 'cultural', label: 'Cultural Notes' }
  ] as const;

  // Function to truncate text
  const truncateText = (text: string | undefined, maxLength: number = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Check if text needs truncation
  const needsTruncation = (text: string | undefined, maxLength: number = 150) => {
    if (!text) return false;
    return text.length > maxLength;
  };

  // Safe access to name properties with defaults
  const safeName = {
    chinese: name?.chinese || '',
    pinyin: name?.pinyin || '',
    meaning: name?.meaning || '',
    culturalNotes: name?.culturalNotes || '',
    personalityMatch: name?.personalityMatch || '',
    style: name?.style || '',
    characters: name?.characters || []
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'meaning':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-2">Name Meaning</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isExpanded ? safeName.meaning : truncateText(safeName.meaning)}
              </p>
              {needsTruncation(safeName.meaning) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary/80 p-0 h-auto mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-2">Why It Suits You</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isExpanded ? safeName.personalityMatch : truncateText(safeName.personalityMatch)}
              </p>
              {needsTruncation(safeName.personalityMatch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary/80 p-0 h-auto mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>
          </div>
        );

      case 'characters':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground mb-3">Character Breakdown</h4>
            <div className="space-y-3">
              {safeName.characters.map((char, charIndex) => (
                <div key={char.character} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className="font-serif text-lg text-primary w-8 h-8 flex items-center justify-center bg-background rounded border border-border flex-shrink-0">
                    {char.character}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">{char.pinyin}</div>
                    <div className="text-sm font-medium text-foreground mb-1">{char.meaning}</div>
                    {char.explanation && (
                      <div className="text-xs text-muted-foreground">
                        {isExpanded ? char.explanation : truncateText(char.explanation, 80)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {safeName.characters.some(char => char.explanation && needsTruncation(char.explanation, 80)) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary/80 p-0 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </Button>
            )}
          </div>
        );

      case 'cultural':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground mb-2">Cultural Context</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isExpanded ? safeName.culturalNotes : truncateText(safeName.culturalNotes)}
            </p>
            {needsTruncation(safeName.culturalNotes) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary/80 p-0 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer group h-[500px] flex flex-col ${
        isSelected 
          ? 'ring-2 ring-primary bg-primary/5' 
          : 'hover:shadow-md border-border'
      }`}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-primary text-primary-foreground rounded-full p-1 w-6 h-6 flex items-center justify-center">
            <span className="text-xs font-bold">✓</span>
          </div>
        </div>
      )}

      {/* Style badge */}
      <div className="absolute top-3 left-3 z-10">
        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
          {safeName.style}
        </Badge>
      </div>

      {/* Header - Fixed height */}
      <CardHeader className="p-6 pb-4 pt-12 flex-shrink-0">
        <CardTitle className="space-y-2">
          <div className="font-serif text-2xl text-primary min-h-[2rem] flex items-center gap-2">
            {safeName.chinese}
            {enableVoicePlayback && (
              <>
                {user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 flex-shrink-0 ${
                      isPlaying 
                        ? 'text-primary animate-pulse' 
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                    onClick={handlePlayAudio}
                    disabled={isPlaying}
                    title="Play pronunciation"
                  >
                    {isPlaying ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({
                        title: "Sign in required",
                        description: "Please sign in to use voice playback feature!",
                        variant: "destructive",
                      });
                    }}
                    title="Sign in to play pronunciation"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground font-normal min-h-[1.25rem]">
            {safeName.pinyin}
          </div>
        </CardTitle>
      </CardHeader>

      {/* Tabs - Fixed height */}
      <div className="px-6 flex-shrink-0">
        <div className="flex space-x-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab.id);
                setIsExpanded(false); // Reset expansion when switching tabs
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area - Expanded height with proper scrolling */}
      <CardContent className="p-6 pt-4 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4 flex-shrink-0">
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
            >
              <Heart 
                className={`h-4 w-4 ${
                  isLiked ? 'fill-primary text-primary' : ''
                }`} 
              />
            </Button>
            {/* PDF Generation Button - Only for authenticated users */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${
                  isGeneratingPDF 
                    ? 'text-red-500 animate-pulse' 
                    : 'text-muted-foreground hover:text-red-500'
                }`}
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                title="Generate PDF Certificate (1 Credit)"
              >
                {isGeneratingPDF ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10 h-8"
            onClick={(e) => {
              e.stopPropagation();
              // 编码名字数据并跳转到详细页面
              const encodedData = encodeURIComponent(JSON.stringify(safeName));
              router.push(`/name-detail?data=${encodedData}`);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}