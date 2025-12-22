import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      <div className="w-full max-w-4xl px-4 py-16 md:px-6">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              About ChineseName.club
            </h1>
            <p className="text-xl text-gray-600">
              Connecting cultures through meaningful AI-generated Chinese names
            </p>
          </div>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              We believe that a name is more than just a way to address someone — it's a connection
              to culture, history, and identity. ChineseName.club helps people from around the world bridge
              cultural gaps by providing them with meaningful Chinese names that resonate with
              their personalities and preferences.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Using advanced artificial intelligence technology, we analyze your personal traits, interests, and preferences
              to generate names that are not just phonetically pleasing but also carry deep cultural
              significance and positive meanings in Chinese tradition.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">How Our AI Works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-violet-100">
                <CardContent className="p-8 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold">Input Analysis</h3>
                  <p className="text-gray-600">
                    Our AI analyzes your English name, gender preference, and personality traits to understand your unique characteristics.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-violet-100">
                <CardContent className="p-8 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-bold">Cultural Matching</h3>
                  <p className="text-gray-600">
                    Advanced algorithms match your profile with appropriate Chinese characters that carry positive meanings and cultural significance.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-violet-100">
                <CardContent className="p-8 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-bold">Name Generation</h3>
                  <p className="text-gray-600">
                    Generate multiple personalized Chinese names with detailed meanings, pronunciations, and cultural context.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose Chinese Names?</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              In Chinese culture, names hold immense significance. They're carefully chosen to reflect
              aspirations, virtues, and qualities. A meaningful Chinese name can:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-600">
              <li>Help you connect more authentically with Chinese friends, colleagues, and communities</li>
              <li>Demonstrate respect and appreciation for Chinese culture and traditions</li>
              <li>Make your experience in China or with Chinese speakers more immersive and personal</li>
              <li>Provide you with a unique perspective on your identity and cultural connections</li>
              <li>Enhance your language learning journey if you're studying Chinese</li>
              <li>Create meaningful connections in business and personal relationships</li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Service Options</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-gray-200">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">Free Version</h3>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">Free</span>
                  </div>
                  <p className="text-gray-600">
                    Get started with our basic Chinese name generation service. Perfect for exploring 
                    what a Chinese name might mean for you.
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Limited daily name generations</li>
                    <li>Basic name meanings</li>
                    <li>Standard pronunciation guides</li>
                    <li>No account required</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-violet-200 bg-violet-50">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-violet-900">Premium Version</h3>
                    <span className="bg-violet-600 text-white px-3 py-1 rounded-full text-sm font-medium">Paid</span>
                  </div>
                  <p className="text-gray-600">
                    Unlock the full potential of our AI with unlimited access and advanced features 
                    for the most meaningful name experience.
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Unlimited name generations</li>
                    <li>Detailed cultural meanings and context</li>
                    <li>Advanced pronunciation guides</li>
                    <li>Character analysis and etymology</li>
                    <li>Priority customer support</li>
                    <li>Export and save functionality</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-6 bg-gray-50 p-8 rounded-2xl">
            <h2 className="text-3xl font-bold text-gray-900">Contact & Support</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Have questions about our AI Chinese name generator or need assistance? Our team is here to help you on your 
              journey to finding the perfect Chinese name that reflects your personality and honors Chinese cultural traditions.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Get in Touch</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-violet-600 font-semibold">Email:</span>
                    <a href="mailto:support@chinesename.club" className="text-violet-600 hover:text-violet-700 underline">
                      support@chinesename.club
                    </a>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-violet-600 font-semibold">Website:</span>
                    <a href="https://chinesename.club" className="text-violet-600 hover:text-violet-700 underline">
                      chinesename.club
                    </a>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Quick Links</h3>
                <div className="space-y-2">
                  <div>
                    <Link href="/privacy" className="text-gray-600 hover:text-violet-600">Privacy Policy</Link>
                  </div>
                  <div>
                    <Link href="/terms" className="text-gray-600 hover:text-violet-600">Terms of Use</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-center pt-8">
            <Button asChild size="lg" className="h-12 px-8 text-lg bg-violet-600 hover:bg-violet-700">
              <Link href="/">Generate Your Chinese Name Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}