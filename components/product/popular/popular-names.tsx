"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Users } from "lucide-react";

interface PopularName {
  chinese: string;
  pinyin: string;
  meaning: string;
  gender: 'male' | 'female' | 'unisex';
  popularity: number;
  cultural_significance: string;
}

// Sample popular names data
const popularNames: PopularName[] = [
  {
    chinese: "李雨桐",
    pinyin: "Lǐ Yǔtóng",
    meaning: "Rain and paulownia tree - symbolizing grace and growth",
    gender: "female",
    popularity: 95,
    cultural_significance: "A name that represents natural beauty and strength"
  },
  {
    chinese: "王志明",
    pinyin: "Wáng Zhìmíng",
    meaning: "Bright ambition - representing wisdom and determination",
    gender: "male",
    popularity: 92,
    cultural_significance: "Classic name embodying traditional values of wisdom and aspiration"
  },
  {
    chinese: "陈美丽",
    pinyin: "Chén Měilì",
    meaning: "Beautiful and graceful - representing inner and outer beauty",
    gender: "female",
    popularity: 88,
    cultural_significance: "Timeless name celebrating feminine grace and beauty"
  },
  {
    chinese: "张伟强",
    pinyin: "Zhāng Wěiqiáng",
    meaning: "Great strength - symbolizing power and resilience",
    gender: "male",
    popularity: 87,
    cultural_significance: "Name reflecting strength of character and leadership qualities"
  },
  {
    chinese: "刘慧敏",
    pinyin: "Liú Huìmǐn",
    meaning: "Wise and quick-minded - representing intelligence and agility",
    gender: "female",
    popularity: 85,
    cultural_significance: "Name celebrating intellectual prowess and sharp thinking"
  },
  {
    chinese: "黄文昊",
    pinyin: "Huáng Wénhào",
    meaning: "Literary and vast - representing scholarly achievement",
    gender: "male",
    popularity: 83,
    cultural_significance: "Name honoring academic excellence and broad knowledge"
  }
];

interface PopularNamesProps {
  showAll?: boolean;
  onScrollToGenerator?: () => void;
}

export default function PopularNames({ showAll = false, onScrollToGenerator }: PopularNamesProps) {
  const displayedNames = showAll ? popularNames : popularNames.slice(0, 6);

  const handleGenerateClick = () => {
    if (onScrollToGenerator) {
      onScrollToGenerator();
    } else {
      const formSection = document.querySelector('[data-name-generator-form]');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'female':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male':
        return '♂';
      case 'female':
        return '♀';
      default:
        return '⚧';
    }
  };

  return (
    <section className="w-full space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Star className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Popular Names
          </h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Discover popular Chinese names created by our AI and loved by our community worldwide
        </motion.p>
      </div>

      {/* Names Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedNames.map((name, index) => (
          <motion.div
            key={name.chinese}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-all duration-300 border border-border group hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                {/* Header with name and popularity */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl text-primary font-semibold">
                      {name.chinese}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {name.pinyin}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getGenderColor(name.gender)}`}
                    >
                      {getGenderIcon(name.gender)} {name.gender}
                    </Badge>
                  </div>
                </div>

                {/* Popularity indicator */}
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${name.popularity}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {name.popularity}%
                  </span>
                </div>

                {/* Meaning */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Meaning</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {name.meaning}
                  </p>
                </div>

                {/* Cultural significance */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Cultural Significance</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {name.cultural_significance}
                  </p>
                </div>

                {/* Stats */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Popular choice</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>Popular</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-4"
      >
        <p className="text-muted-foreground">
          Get inspired by these popular names, or create your own personalized Chinese name
        </p>
        <Button
          onClick={handleGenerateClick}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
        >
          Generate My Name
        </Button>
      </motion.div>
    </section>
  );
}