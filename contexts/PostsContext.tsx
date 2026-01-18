
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Post {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}

interface PostsContextType {
  posts: Post[];
  addPost: (post: Post) => void;
  removePost: (id: string) => void;
  refreshPosts: () => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);

  const addPost = (post: Post) => {
    setPosts(prev => [post, ...prev]);
  };

  const removePost = (id: string) => {
    setPosts(prev => prev.filter(post => post.id !== id));
  };

  const refreshPosts = () => {
    console.log('[PostsContext] Refreshing posts...');
  };

  return (
    <PostsContext.Provider value={{ posts, addPost, removePost, refreshPosts }}>
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
