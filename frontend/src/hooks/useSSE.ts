import { useEffect, useRef } from 'react';

export function useSSE(eventHandlers: { [eventType: string]: (data: any) => void }) {
  const handlersRef = useRef(eventHandlers);

  // Keep handlers updated with the latest references
  useEffect(() => {
    handlersRef.current = eventHandlers;
  }, [eventHandlers]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const cleanBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const sseUrl = token 
      ? `${cleanBaseUrl}/api/realtime/stream?token=${encodeURIComponent(token)}`
      : `${cleanBaseUrl}/api/realtime/stream`;

    const eventSource = new EventSource(sseUrl);

    // Predefined events we want to listen to
    const defaultEvents = [
      'connected',
      'class-update',
      'student-update',
      'teacher-update',
      'user-update',
      'submission-update',
      'force-logout'
    ];

    defaultEvents.forEach(eventType => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const parsedData = JSON.parse(event.data);
          if (handlersRef.current[eventType]) {
            handlersRef.current[eventType](parsedData);
          }
        } catch (err) {
          if (handlersRef.current[eventType]) {
            handlersRef.current[eventType](event.data);
          }
        }
      });
    });

    eventSource.onerror = (err) => {
      console.error('[SSE Error] Connection error or timeout:', err);
    };

    return () => {
      eventSource.close();
    };
  }, []); // Reconnects only if token or component mounts/unmounts
}
