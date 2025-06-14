
import React from 'react';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts';

const Stats = () => {
  const { entries, statsData } = useJournal();
  
  // Prepare mood data for the chart
  const moodChartData = [
    { name: 'Happy', value: statsData.moodCounts.happy, color: '#4ade80' },
    { name: 'Content', value: statsData.moodCounts.content, color: '#60a5fa' },
    { name: 'Neutral', value: statsData.moodCounts.neutral, color: '#a3a3a3' },
    { name: 'Sad', value: statsData.moodCounts.sad, color: '#94a3b8' },
    { name: 'Anxious', value: statsData.moodCounts.anxious, color: '#fb7185' },
    { name: 'Angry', value: statsData.moodCounts.angry, color: '#ef4444' },
    { name: 'Emotional', value: statsData.moodCounts.emotional, color: '#c084fc' },
    { name: 'In Love', value: statsData.moodCounts["in-love"], color: '#f472b6' },
    { name: 'Excited', value: statsData.moodCounts.excited, color: '#fbbf24' },
    { name: 'Tired', value: statsData.moodCounts.tired, color: '#9ca3af' }
  ];
  
  // Count entries by month for the current year
  const entriesByMonth = Array(12).fill(0);
  
  entries.forEach(entry => {
    const entryDate = new Date(entry.date);
    if (entryDate.getFullYear() === new Date().getFullYear()) {
      entriesByMonth[entryDate.getMonth()]++;
    }
  });
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthlyChartData = monthNames.map((name, index) => ({
    name,
    entries: entriesByMonth[index],
  }));

  // Calculate additional stats
  const calculateAdditionalStats = () => {
    // Average words per entry
    const totalWords = entries.reduce((sum, entry) => {
      return sum + entry.content.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
    const avgWordsPerEntry = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;

    // Entries with music
    const entriesWithMusic = entries.filter(entry => entry.track).length;
    const musicPercentage = entries.length > 0 ? Math.round((entriesWithMusic / entries.length) * 100) : 0;

    // Entries with weather
    const entriesWithWeather = entries.filter(entry => entry.weather).length;
    const weatherPercentage = entries.length > 0 ? Math.round((entriesWithWeather / entries.length) * 100) : 0;

    // Current streak
    let currentStreak = 0;
    if (entries.length > 0) {
      const today = new Date().toLocaleDateString('en-CA');
      const sortedDates = [...new Set(entries.map(e => e.date))].sort().reverse();
      
      for (let i = 0; i < sortedDates.length; i++) {
        const date = new Date(sortedDates[i]);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedDateStr = expectedDate.toLocaleDateString('en-CA');
        
        if (sortedDates[i] === expectedDateStr) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Days of week analysis
    const dayOfWeekCounts = Array(7).fill(0);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    entries.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay();
      dayOfWeekCounts[dayOfWeek]++;
    });

    const dayOfWeekData = dayNames.map((name, index) => ({
      name,
      entries: dayOfWeekCounts[index]
    }));

    // Most active day
    const mostActiveDay = dayOfWeekCounts.reduce((maxIndex, count, index, arr) => 
      count > arr[maxIndex] ? index : maxIndex, 0
    );

    // Top artists from Spotify tracks
    const artistCounts: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.track?.artist) {
        artistCounts[entry.track.artist] = (artistCounts[entry.track.artist] || 0) + 1;
      }
    });

    const topArtists = Object.entries(artistCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count }));

    return {
      avgWordsPerEntry,
      musicPercentage,
      weatherPercentage,
      currentStreak,
      dayOfWeekData,
      mostActiveDay: dayNames[mostActiveDay],
      topArtists
    };
  };

  const additionalStats = calculateAdditionalStats();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Journal Stats</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{statsData.totalEntries}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {additionalStats.currentStreak} {additionalStats.currentStreak === 1 ? 'day' : 'days'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Longest Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {statsData.longestStreak} {statsData.longestStreak === 1 ? 'day' : 'days'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Words per Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{additionalStats.avgWordsPerEntry}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Common Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {statsData.mostCommonTime || 'N/A'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Active Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{additionalStats.mostActiveDay}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entries with Music
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{additionalStats.musicPercentage}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entries with Weather
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{additionalStats.weatherPercentage}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Common Mood
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Find the mood with highest count
                const moodEntries = Object.entries(statsData.moodCounts);
                if (moodEntries.length === 0) return <p className="text-3xl font-bold">N/A</p>;
                
                const [topMood] = moodEntries.reduce((max, current) => 
                  current[1] > max[1] ? current : max
                );
                
                const moodEmojis = {
                  'happy': '😄',
                  'content': '😊',
                  'neutral': '😐',
                  'sad': '😔',
                  'anxious': '😰',
                  'angry': '😠',
                  'emotional': '🥹',
                  'in-love': '😍',
                  'excited': '🤩',
                  'tired': '😴'
                };
                
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{moodEmojis[topMood as keyof typeof moodEmojis]}</span>
                    <span className="text-2xl font-bold capitalize">{topMood.replace('-', ' ')}</span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Mood Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} entries`, 'Count']} 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Bar dataKey="value" name="Entries">
                      {moodChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Entries by Day of Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={additionalStats.dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} entries`, 'Count']} 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Bar dataKey="entries" fill="#9b87f5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Entries by Month (This Year)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} entries`, 'Count']} 
                      cursor={{ stroke: '#9b87f5', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="entries" 
                      stroke="#9b87f5" 
                      strokeWidth={3}
                      dot={{ fill: '#9b87f5', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {additionalStats.topArtists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Artists in Your Journal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {additionalStats.topArtists.map((artist, index) => (
                    <div key={artist.artist} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{artist.artist}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {artist.count} {artist.count === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Stats;
