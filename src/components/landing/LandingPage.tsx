
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Music, BarChart3, Heart, Clock, BookOpen, TrendingUp, Zap } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-journal-light via-white to-journal-purple/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-journal-purple to-journal-blue bg-clip-text text-transparent mb-6 animate-fade-in">
              Eternal Entries
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed animate-fade-in">
              Your personal sanctuary for <span className="font-semibold text-journal-purple">emotional insight</span>, 
              <span className="font-semibold text-journal-blue"> memory</span>, and 
              <span className="font-semibold text-journal-green"> reflection</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in">
            <Button asChild size="lg" className="bg-journal-purple hover:bg-journal-purple/90 text-white px-8 py-3 text-lg">
              <Link to="/auth">Start Your Journey</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-journal-purple text-journal-purple hover:bg-journal-purple/10 px-8 py-3 text-lg">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="relative animate-fade-in">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto border border-journal-purple/20">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-5 w-5 text-journal-blue" />
                <span className="text-sm text-gray-600">Today, June 4th, 2025</span>
                <Music className="h-5 w-5 text-journal-green ml-auto" />
              </div>
              <div className="text-left space-y-3 text-gray-700">
                <p className="text-lg">Had an amazing breakthrough today...</p>
                <div className="bg-journal-light/50 p-3 rounded-lg border-l-4 border-journal-purple">
                  <p className="text-sm italic">On this day last year: "Still figuring things out, but I'm hopeful..."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Why Eternal Entries?
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-3xl mx-auto">
            More than just a journal — it's a time machine for your emotional journey, 
            helping you see patterns, growth, and the beautiful evolution of your story.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Time Travel Feature */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-journal-purple/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-journal-blue/20 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-journal-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Time Travel Through Memory</h3>
                <p className="text-gray-600 leading-relaxed">
                  See what you wrote on this exact day in previous years. Watch your growth, 
                  notice patterns, and celebrate how far you've come.
                </p>
              </CardContent>
            </Card>

            {/* Music Memory Feature */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-journal-green/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-journal-green/20 rounded-lg flex items-center justify-center mb-4">
                  <Music className="h-6 w-6 text-journal-green" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Emotional Anchoring with Music</h3>
                <p className="text-gray-600 leading-relaxed">
                  Log the song you're listening to while journaling. When you revisit entries, 
                  the music instantly transports you back to that exact emotional moment.
                </p>
              </CardContent>
            </Card>

            {/* Insights Feature */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-journal-purple/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-journal-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-journal-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Insightful Reflection</h3>
                <p className="text-gray-600 leading-relaxed">
                  Track your journaling streaks, mood patterns, and writing habits. 
                  Discover insights about yourself through beautiful, meaningful data.
                </p>
              </CardContent>
            </Card>

            {/* Weather Context */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-journal-blue/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-journal-blue/20 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-journal-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Rich Context</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automatically capture the weather, time, and mood of each entry. 
                  Create a complete picture of your emotional landscape.
                </p>
              </CardContent>
            </Card>

            {/* Personal Growth */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-journal-green/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-journal-green/20 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-journal-green" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Personal Growth Tracking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Visualize your longest streaks, most active times, and emotional patterns. 
                  Turn your journal into a powerful tool for self-discovery.
                </p>
              </CardContent>
            </Card>

            {/* Beautiful Experience */}
            <Card className="hover:shadow-lg transition-shadow duration-300 border-journal-purple/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-journal-purple/20 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-journal-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Beautiful & Personal</h3>
                <p className="text-gray-600 leading-relaxed">
                  A clean, beautiful interface designed for reflection and growth. 
                  Every detail crafted to make journaling feel special and meaningful.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Preview Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-journal-purple/10 to-journal-blue/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8 text-gray-800">
            Your Journey, Visualized
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Discover powerful insights about your emotional patterns and growth over time
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-journal-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-8 w-8 text-journal-green" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">127</h3>
              <p className="text-gray-600">Day Streak</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-journal-blue/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="h-8 w-8 text-journal-blue" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">342</h3>
              <p className="text-gray-600">Total Entries</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-journal-purple/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-8 w-8 text-journal-purple" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">9:23 PM</h3>
              <p className="text-gray-600">Favorite Time</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-journal-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="h-8 w-8 text-journal-green" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">😊</h3>
              <p className="text-gray-600">Top Mood</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-gray-800">
            Start Your Eternal Journey
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Join thousands who are discovering deeper insights about themselves through intentional reflection. 
            Your future self will thank you for starting today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-journal-purple hover:bg-journal-purple/90 text-white px-8 py-3 text-lg">
              <Link to="/auth">Begin Journaling Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-journal-purple text-journal-purple hover:bg-journal-purple/10 px-8 py-3 text-lg">
              <Link to="/auth">I Already Have an Account</Link>
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            No credit card required • Start writing immediately • Your memories, secured forever
          </p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
