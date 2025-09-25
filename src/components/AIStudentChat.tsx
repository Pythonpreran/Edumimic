import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Bot, HelpCircle, Heart } from 'lucide-react';

interface AIMessage {
  timestamp: number;
  message: string;
  type: 'question' | 'reaction';
}

interface AIStudentChatProps {
  messages: AIMessage[];
}

export default function AIStudentChat({ messages }: AIStudentChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageIcon = (type: string) => {
    return type === 'question' ? <HelpCircle className="h-3 w-3" /> : <Heart className="h-3 w-3" />;
  };

  const getMessageStyle = (type: string) => {
    return type === 'question' 
      ? 'border-l-4 border-warning bg-warning/5' 
      : 'border-l-4 border-success bg-success/5';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStudentNames = () => ['Emma', 'Alex', 'Sarah', 'Mike', 'Lisa', 'David', 'Jenny', 'Tom'];

  const getRandomStudent = () => {
    const names = getStudentNames();
    return names[Math.floor(Math.random() * names.length)];
  };

  return (
    <Card className="p-4 h-80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Student Responses</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            {messages.length} interactions
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-xs ${messages.length > 0 ? 'bg-success/10 text-success' : ''}`}
          >
            {messages.filter(m => m.type === 'question').length} questions
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-56" ref={scrollRef}>
        <div className="space-y-3 pr-4">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${getMessageStyle(msg.type)} hover:shadow-sm transition-all`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={msg.type === 'question' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {getMessageIcon(msg.type)}
                      <span className="ml-1">{getStudentNames()[index % getStudentNames().length]}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${msg.type === 'question' ? 'text-warning' : 'text-success'}`}
                  >
                    {msg.type}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {msg.message}
                </p>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">AI Students are listening...</p>
                <p className="text-xs text-muted-foreground">
                  They'll ask questions and react to your teaching
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Student Engagement Indicator */}
      <div className="mt-3 p-2 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Student Engagement:</span>
          <div className="flex items-center gap-2">
            {messages.length === 0 && (
              <Badge variant="outline" className="text-xs">Waiting...</Badge>
            )}
            {messages.length > 0 && messages.length < 3 && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning">Low</Badge>
            )}
            {messages.length >= 3 && messages.length < 6 && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">Medium</Badge>
            )}
            {messages.length >= 6 && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success">High</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}