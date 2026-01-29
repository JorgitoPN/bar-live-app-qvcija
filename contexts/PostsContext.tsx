
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PostsContextType {
  refreshPosts: () => Promise<void>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const refreshPosts = useCallback(async () => {
    console.log('[PostsContext] 🔄 Refreshing posts...');
    // TODO: Implement post refresh logic
  }, []);

  return (
    <PostsContext.Provider value={{ refreshPosts }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
}
